import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { chapters } from '../content/repository'
import { resolveChapterLocation } from './routes'

export const useChapterNavigation = () => {
  const location = shallowRef(resolveChapterLocation(window.location.hash, chapters))
  const currentChapter = computed(() => location.value.chapter)
  const currentSection = computed(() => location.value.section)
  const handleHashChange = () => { location.value = resolveChapterLocation(window.location.hash, chapters) }
  window.addEventListener('hashchange', handleHashChange)
  onBeforeUnmount(() => window.removeEventListener('hashchange', handleHashChange))
  return { currentChapter, currentSection }
}
