import { computed, onMounted, ref, watch } from 'vue'
import type { Question, Topic } from '../../../contracts/content'
import { useCodeRunner } from '../../shared/code-playground/useCodeRunner'
import { useExerciseEdits } from './useExerciseEdits'

export const useExerciseSession = (getTopic: () => Topic, edits = useExerciseEdits()) => {
  const { output, isRunning, runCode, stop, clear } = useCodeRunner()
  const { saving, lastSavedAt, devWritable, error, loadFromFile, getEdit, setEdit, removeEdit } = edits
  const code = ref('')
  const currentId = ref<number | null>(null)
  const showAnswer = ref(false)
  let previous: { topicId: string; question: Question } | null = null
  let applyingCode = false
  let temporaryReset = false

  const grouped = computed(() => {
    const groups = new Map<string, Question[]>()
    for (const question of getTopic().questions) {
      const items = groups.get(question.group)
      if (items) items.push(question)
      else groups.set(question.group, [question])
    }
    return [...groups].map(([group, items]) => ({ group, items }))
  })
  const currentQuestion = computed(() => getTopic().questions.find((question) => question.id === currentId.value) ?? null)
  const isModified = computed(() => currentQuestion.value !== null && code.value !== currentQuestion.value.code)
  const saveStatus = computed(() => {
    if (error.value) return error.value
    if (!devWritable.value) return '自动保存仅支持 bun run dev'
    if (saving.value) return '保存中…'
    if (lastSavedAt.value) return '已自动保存 ' + formatTime(lastSavedAt.value)
    return ''
  })

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return [date.getHours(), date.getMinutes(), date.getSeconds()].map((value) => String(value).padStart(2, '0')).join(':')
  }
  const hasSavedEdit = (question: Question) => {
    const saved = getEdit(getTopic().id, question.id)
    return saved !== undefined && saved !== question.code
  }
  const flushCurrentEdit = () => {
    if (!previous || temporaryReset) return
    const { topicId, question } = previous
    if (code.value === question.code) {
      if (getEdit(topicId, question.id) !== undefined) removeEdit(topicId, question.id)
      return
    }
    if (getEdit(topicId, question.id) !== code.value) setEdit(topicId, question.id, code.value)
  }
  const loadQuestion = (question: Question) => {
    stop()
    flushCurrentEdit()
    applyingCode = true
    code.value = getEdit(getTopic().id, question.id) ?? question.code
    applyingCode = false
    currentId.value = question.id
    previous = { topicId: getTopic().id, question }
    temporaryReset = false
    showAnswer.value = false
    clear()
  }
  const handleRun = () => runCode(code.value)
  const handleReset = () => {
    if (!currentQuestion.value) return
    // 重置只恢复当前编辑器，保留存档；下一次实际编辑才恢复自动保存。
    applyingCode = true
    temporaryReset = true
    code.value = currentQuestion.value.code
    applyingCode = false
  }

  watch(code, () => {
    if (applyingCode) return
    temporaryReset = false
    flushCurrentEdit()
  }, { flush: 'sync' })
  watch(() => getTopic().id, () => {
    const first = getTopic().questions[0]
    if (first) loadQuestion(first)
  })
  onMounted(async () => {
    await loadFromFile()
    const first = getTopic().questions[0]
    if (first) loadQuestion(first)
  })

  return { output, isRunning, stop, code, currentId, showAnswer, grouped, currentQuestion, hasSavedEdit, isModified, loadQuestion, handleRun, handleReset, saveStatus }
}
