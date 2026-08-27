import { ref, watch, onBeforeUnmount } from 'vue'

// 编辑持久化：把用户在编辑器里改过的代码存到 public/runner-edits.json，
// 随仓库一起 git commit/push → 换台电脑 git pull 即可同步。
//
// 保存写入：
//   - 主路径：File System Access API（showSaveFilePicker），Chrome / Edge 可直接写
//     仓库里的 public/runner-edits.json。首次会弹文件选择框，之后把句柄存进
//     IndexedDB，后续保存静默复用，不再弹框。
//   - 回退：浏览器不支持或用户拒绝授权时，改为下载 runner-edits.json，用户手动
//     放回 public/ 覆盖再 commit。
// 读取：fetch('/runner-edits.json')，开发态从 public 直读、生产态从部署站点读。
//
// 编辑会"静默自动保存"：只要已经拿到文件句柄（hasHandle 为 true），edit 变化后
// 延时 1.2s 自动写盘，免去逐次点保存；没有句柄前不自动写（避免每改一下就弹框/下载）。

const EDITS_URL = '/runner-edits.json'
const DB_NAME = 'vue-mastery-runner'
const STORE = 'fs-handles'
const HANDLE_KEY = 'runner-edits'
const AUTO_SAVE_MS = 1200

export interface EditsData {
  version: number
  edits: Record<string, Record<string, string>> // topicId -> questionId -> code
}

export function usePersistedEdits() {
  const edits = ref<Record<string, Record<string, string>>>({})
  const loaded = ref(false)
  const saving = ref(false)
  const lastSavedAt = ref<number | null>(null)
  const saveError = ref<string | null>(null)
  const saveMethod = ref<'fsa' | 'download' | null>(null)
  const hasHandle = ref(false)

  let autoTimer: ReturnType<typeof setTimeout> | null = null
  // 载入时对 edits.value 的整体赋值也会触发 watcher，用这个标记压住这一次，
  // 避免刚读完文件又把同样内容写回去。
  let suppressAutoOnce = false

  async function loadFromFile() {
    try {
      const res = await fetch(EDITS_URL, { cache: 'no-store' })
      if (res.ok) {
        const data = (await res.json()) as EditsData
        if (data && data.edits && typeof data.edits === 'object') {
          suppressAutoOnce = true
          edits.value = data.edits
        }
      }
      // 404（首次还没文件）或空 body：保持空 edits，不报错
    } catch (e) {
      // 取不到不阻塞页面，只是编辑不会被恢复
      console.warn('加载编辑失败：', e)
    } finally {
      loaded.value = true
    }
    hasHandle.value = (await getStoredHandle()) !== null
  }

  function getEdit(topicId: string, questionId: number): string | undefined {
    return edits.value[topicId]?.[String(questionId)]
  }

  function setEdit(topicId: string, questionId: number, code: string) {
    const t = edits.value[topicId] ?? (edits.value[topicId] = {})
    t[String(questionId)] = code
  }

  function removeEdit(topicId: string, questionId: number) {
    const t = edits.value[topicId]
    if (!t) return
    delete t[String(questionId)]
    if (Object.keys(t).length === 0) delete edits.value[topicId]
  }

  // ── IndexedDB：存取 FileSystemFileHandle ──────────────────────────
  function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  async function getStoredHandle(): Promise<FileSystemFileHandle | null> {
    if (!('indexedDB' in window)) return null
    try {
      const db = await openDb()
      const result = await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(HANDLE_KEY)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      db.close()
      return (result as FileSystemFileHandle | undefined) ?? null
    } catch {
      return null
    }
  }

  async function storeHandle(handle: FileSystemFileHandle) {
    try {
      const db = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(handle, HANDLE_KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    } catch (e) {
      console.warn('保存文件句柄失败：', e)
    }
  }

  async function clearStoredHandle() {
    try {
      const db = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(HANDLE_KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    } catch {
      /* 忽略 */
    }
    hasHandle.value = false
  }

  // ── 写文件 ───────────────────────────────────────────────────────
  // auto=true 表示由"编辑触发"的静默保存，没有用户手势，不能弹文件选择框 / 权限框。
  //   有已授权句柄 → 直接写；否则跳过（不下载、不报错）。
  //   注：queryPermission / requestPermission 在不同 TS lib 版本里不一定声明，
  //   这里用结构化类型断言稳妥调用；方法不存在时按"已授权"处理，交给 createWritable 兜底。
  type HandleWithPerms = FileSystemHandle & {
    queryPermission?: (d?: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
    requestPermission?: (d?: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  }
  async function ensureWriteHandle(
    requireGesture: boolean,
  ): Promise<FileSystemFileHandle | null> {
    let handle = await getStoredHandle()
    if (!handle) {
      if (!requireGesture || !('showSaveFilePicker' in window)) return null
      handle = await window.showSaveFilePicker({
        suggestedName: 'runner-edits.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      })
      await storeHandle(handle)
      hasHandle.value = true
    }
    const h = handle as unknown as HandleWithPerms
    const perm = (await h.queryPermission?.({ mode: 'readwrite' })) ?? 'granted'
    if (perm === 'granted') return handle
    if (perm === 'prompt') {
      if (!requireGesture) return null
      const newPerm = (await h.requestPermission?.({ mode: 'readwrite' })) ?? 'denied'
      if (newPerm !== 'granted') {
        await clearStoredHandle()
        throw new Error('文件访问被拒绝')
      }
      return handle
    }
    // denied：清掉旧句柄，让下次重新选
    await clearStoredHandle()
    throw new Error('文件访问被拒绝')
  }

  function buildJson(): string {
    const data: EditsData = { version: 1, edits: edits.value }
    return JSON.stringify(data, null, 2)
  }

  async function writeViaHandle(handle: FileSystemFileHandle) {
    const content = buildJson()
    // 用 Blob 写入可保证 UTF-8 编码正确（编辑里含中文，直接写 string 没问题，
    // 但下面截断要按字节数算，Blob.size 正是字节数）。
    const blob = new Blob([content], { type: 'application/json' })
    const writable = await handle.createWritable()
    // createWritable 不会自动清空旧内容：新内容若比旧文件短，会残留尾部字节，
    // 让 JSON 尾巴出现脏数据。先 truncate(0) 清空，再写，保证文件与内容等长。
    await writable.truncate(0)
    await writable.write(blob)
    await writable.close()
  }

  function downloadFallback() {
    const blob = new Blob([buildJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'runner-edits.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function doSave(opts: { auto: boolean }) {
    if (opts.auto && !hasHandle.value) return // 没有句柄就不自动写
    saving.value = true
    saveError.value = null
    try {
      let handle: FileSystemFileHandle | null = null
      try {
        handle = await ensureWriteHandle(!opts.auto)
      } catch (e) {
        const err = e as { name?: string; message?: string }
        if (err?.name === 'AbortError') return // 用户取消选择框
        if (opts.auto) {
          saveError.value = err?.message ?? '保存失败'
          await clearStoredHandle()
          return
        }
        // 显式保存遇到授权问题 → 回退下载
        downloadFallback()
        saveMethod.value = 'download'
        saveError.value = '已改为下载：请把 runner-edits.json 放到 public/ 覆盖原文件，再 git commit/push。'
        lastSavedAt.value = Date.now()
        return
      }
      if (handle) {
        await writeViaHandle(handle)
        saveMethod.value = 'fsa'
        lastSavedAt.value = Date.now()
      } else if (!opts.auto) {
        // 无 FSA 能力：显式保存走下载回退
        downloadFallback()
        saveMethod.value = 'download'
        saveError.value = '浏览器不支持直接写文件，已下载：请把 runner-edits.json 放到 public/ 覆盖再 commit。'
        lastSavedAt.value = Date.now()
      }
    } finally {
      saving.value = false
    }
  }

  function saveNow() {
    return doSave({ auto: false })
  }

  function scheduleAutoSave() {
    if (autoTimer) clearTimeout(autoTimer)
    autoTimer = setTimeout(() => {
      autoTimer = null
      void doSave({ auto: true })
    }, AUTO_SAVE_MS)
  }

  // edits 一旦变动（setEdit / removeEdit），若有句柄就延时自动写盘
  watch(
    edits,
    () => {
      if (suppressAutoOnce) {
        suppressAutoOnce = false
        return
      }
      if (hasHandle.value) scheduleAutoSave()
    },
    { deep: true },
  )

  // 组件卸载时若有挂起的自动保存定时器，清掉，避免卸载后还多写一次盘
  onBeforeUnmount(() => {
    if (autoTimer) {
      clearTimeout(autoTimer)
      autoTimer = null
    }
  })

  return {
    edits,
    loaded,
    saving,
    lastSavedAt,
    saveError,
    saveMethod,
    hasHandle,
    loadFromFile,
    saveNow,
    getEdit,
    setEdit,
    removeEdit,
    clearStoredHandle,
  }
}
