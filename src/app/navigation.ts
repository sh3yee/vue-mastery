import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { chapters } from '../content/repository'
import { getChapterHref } from '../content/links'
import { readReadingProgress } from '../features/notes/readingProgress'
import { resolveChapterLocation } from './routes'

export const useChapterNavigation = () => {
  const initialHash = window.location.hash
  if (!initialHash || initialHash === '#' || initialHash === '#/') {
    const progress = readReadingProgress()
    const chapter = chapters.find((item) => item.kind === 'note' && item.id === progress?.chapterId)
    if (chapter && progress) {
      window.history.replaceState(window.history.state, '', getChapterHref(chapter, progress.routeSection))
    }
  }
  const location = shallowRef(resolveChapterLocation(window.location.hash, chapters))
  const currentChapter = computed(() => location.value.chapter)
  const currentSection = computed(() => location.value.section)
  const handleHashChange = () => { location.value = resolveChapterLocation(window.location.hash, chapters) }
  window.addEventListener('hashchange', handleHashChange)
  onBeforeUnmount(() => window.removeEventListener('hashchange', handleHashChange))
  return { currentChapter, currentSection }
}
