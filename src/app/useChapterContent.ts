import { ref, shallowRef, watch, type Ref } from 'vue'
import type { Chapter, ChapterDefinition } from '../../contracts/content'

export const useChapterContent = (current: Readonly<Ref<ChapterDefinition | null>>, loadChapter: (chapter: ChapterDefinition) => Promise<Chapter>) => {
  const chapter = shallowRef<Chapter | null>(null)
  const loading = ref(false)
  const error = ref('')
  const retry = ref(0)
  const reload = () => { retry.value += 1 }

  watch([current, retry], async ([definition], _, onCleanup) => {
    let cancelled = false
    onCleanup(() => { cancelled = true })
    chapter.value = null
    error.value = ''
    loading.value = Boolean(definition)
    if (!definition) return
    try {
      const result = await loadChapter(definition)
      if (!cancelled) chapter.value = result
    } catch (cause) {
      if (!cancelled) error.value = cause instanceof Error ? cause.message : '章节加载失败'
    } finally {
      if (!cancelled) loading.value = false
    }
  }, { immediate: true })

  return { chapter, loading, error, reload }
}
