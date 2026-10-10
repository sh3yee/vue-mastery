import { ref, watch } from 'vue'
import type { EditsData } from '../../../contracts/edits'
import type { EditsStorage } from './editsStorage'

export const createExerciseEdits = (storage: EditsStorage, delay = 1200) => {
  const edits = ref<EditsData['edits']>({})
  const loaded = ref(false)
  const saving = ref(false)
  const lastSavedAt = ref<number | null>(null)
  const devWritable = ref(false)
  const error = ref('')
  let initializing: Promise<void> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let hydrating = false
  let queued = false

  const save = async () => {
    if (!devWritable.value) return
    if (saving.value) { queued = true; return }
    saving.value = true
    try {
      do {
        queued = false
        const data = JSON.parse(JSON.stringify({ version: 1, edits: edits.value })) as EditsData
        await storage.write(data)
        lastSavedAt.value = Date.now()
      } while (queued)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '保存失败'
      devWritable.value = false
    } finally { saving.value = false }
  }

  const loadFromFile = () => {
    initializing ??= (async () => {
      try {
        const data = await storage.read()
        hydrating = true
        edits.value = data.edits
        hydrating = false
        devWritable.value = await storage.canWrite()
      } catch (cause) {
        // 读取失败时禁止覆盖原文件，保留用户已有存档。
        error.value = cause instanceof Error ? cause.message : '加载练习存档失败'
      } finally { loaded.value = true }
    })()
    return initializing
  }

  const getEdit = (topicId: string, questionId: number) => edits.value[topicId]?.[String(questionId)]
  const setEdit = (topicId: string, questionId: number, code: string) => {
    edits.value[topicId] = { ...edits.value[topicId], [String(questionId)]: code }
  }
  const removeEdit = (topicId: string, questionId: number) => {
    const topic = edits.value[topicId]
    if (!topic) return
    delete topic[String(questionId)]
    if (!Object.keys(topic).length) delete edits.value[topicId]
  }

  const unwatch = watch(edits, () => {
    if (hydrating || !loaded.value) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { timer = undefined; void save() }, delay)
  }, { deep: true, flush: 'sync' })

  const dispose = () => {
    unwatch()
    if (timer) clearTimeout(timer)
  }
  return { edits, loaded, saving, lastSavedAt, devWritable, error, loadFromFile, getEdit, setEdit, removeEdit, dispose }
}
