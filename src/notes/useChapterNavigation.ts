import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { chapters } from './chapters'

const readLocation = () => {
  const [path = '', query = ''] = window.location.hash.slice(1).split('?')
  const [, kind, encodedId = ''] = path.split('/')
  let id = ''
  try {
    id = decodeURIComponent(encodedId)
  } catch {
    // 非法地址回到首章，避免 URI 解码错误阻断页面。
  }
  const chapter = chapters.find((item) => item.id === id && (item.kind === 'note' ? kind === 'notes' : kind === 'lab'))
    ?? chapters[0]!
  return { chapter, section: new URLSearchParams(query).get('section') ?? '' }
}

export const useChapterNavigation = () => {
  const location = shallowRef(readLocation())
  const currentChapter = computed(() => location.value.chapter)
  const currentSection = computed(() => location.value.section)

  const handleHashChange = () => {
    location.value = readLocation()
  }

  window.addEventListener('hashchange', handleHashChange)
  onBeforeUnmount(() => window.removeEventListener('hashchange', handleHashChange))

  return { currentChapter, currentSection }
}
