import { ref, watch, onBeforeUnmount } from 'vue'

// 编辑持久化：把用户在编辑器里改过的代码存到 public/runner-edits.json，
// 随仓库 git commit/push → 换台电脑 git pull 即可同步。
//
// 写入：POST /__runner-edits，由 vite.config.ts 里的 runnerEditsPlugin 中间件
//   用 Node fs 直接写盘（仅 npm run dev 下挂载）。
// 读取：fetch('/runner-edits.json')，开发态从 public 直读、生产态从部署站点读。
//
// 自动保存：edits 变动后延时 1.2s 静默写盘，无需任何按钮。
//   非 dev 环境（preview / 部署）探测到端点不存在 → devWritable=false，静默降级为只读。

const EDITS_URL = '/runner-edits.json'
const SAVE_URL = '/__runner-edits'
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
  const devWritable = ref(false)

  let autoTimer: ReturnType<typeof setTimeout> | null = null
  // 载入时对 edits.value 的整体赋值也会触发 watcher，用这个标记压住这一次，
  // 避免刚读完文件又把同样内容写回去。
  let suppressAutoOnce = false

  // 探测是否在 dev 环境（端点存在且确实是我的中间件）。
  // 失败 / 端点不存在 / SPA 回退成 index.html → 视为只读。
  async function probeDev() {
    try {
      const res = await fetch(SAVE_URL, { method: 'GET', cache: 'no-store' })
      devWritable.value = await isOkResponse(res)
    } catch {
      devWritable.value = false
    }
  }

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
    // 不阻塞 loaded：探测可写性可与读文件并行
    void probeDev()
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

  function buildJson(): string {
    const data: EditsData = { version: 1, edits: edits.value }
    return JSON.stringify(data, null, 2)
  }

  // 判断响应是否来自我的 dev 中间件：必须是 JSON 且 {ok:true}。
  // 防止 preview / SPA 部署把未知路径回退成 index.html（200 + text/html）被误判为可写。
  async function isOkResponse(res: Response): Promise<boolean> {
    const ct = res.headers.get('content-type') ?? ''
    if (!res.ok || !ct.includes('application/json')) return false
    try {
      const data = (await res.clone().json()) as { ok?: boolean }
      return data.ok === true
    } catch {
      return false
    }
  }

  async function saveToFile() {
    if (!devWritable.value) return // 只读环境直接跳过，不刷屏
    saving.value = true
    try {
      const res = await fetch(SAVE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: buildJson(),
      })
      if (await isOkResponse(res)) {
        lastSavedAt.value = Date.now()
      } else {
        // 端点不在 / 坏 JSON / SPA 回退：降级为只读
        devWritable.value = false
      }
    } catch {
      // 网络错 / 端点不存在（preview / 部署）：静默降级
      devWritable.value = false
    } finally {
      saving.value = false
    }
  }

  function scheduleAutoSave() {
    if (autoTimer) clearTimeout(autoTimer)
    autoTimer = setTimeout(() => {
      autoTimer = null
      void saveToFile()
    }, AUTO_SAVE_MS)
  }

  // edits 一旦变动（setEdit / removeEdit），延时自动写盘
  watch(
    edits,
    () => {
      if (suppressAutoOnce) {
        suppressAutoOnce = false
        return
      }
      scheduleAutoSave()
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
    devWritable,
    loadFromFile,
    getEdit,
    setEdit,
    removeEdit,
  }
}
