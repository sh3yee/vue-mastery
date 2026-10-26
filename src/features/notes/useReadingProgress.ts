import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { readReadingProgress, writeReadingProgress } from './readingProgress'

export const useReadingProgress = (
  container: Ref<HTMLElement | null>,
  getChapterId: () => string,
  getRouteSection: () => string,
) => {
  const previous = readReadingProgress()
  let initialized = false
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const saveReadingProgress = () => {
    clearTimeout(saveTimer)
    saveTimer = undefined
    const element = container.value
    if (!initialized || !element) return
    const top = element.getBoundingClientRect().top
    const headings = Array.from(element.querySelectorAll<HTMLElement>('[id^="section-"]'))
    const heading = element.scrollTop > 0
      ? headings.filter((item) => item.getClientRects().length && item.getBoundingClientRect().top <= top + 100).at(-1)
      : undefined
    writeReadingProgress({
      version: 1,
      chapterId: getChapterId(),
      routeSection: getRouteSection(),
      section: heading?.id ?? '',
      offset: heading ? heading.getBoundingClientRect().top - top : 0,
      scrollTop: element.scrollTop,
      openDetails: Array.from(element.querySelectorAll('details')).flatMap((details, index) => details.open ? [index] : []),
    })
  }

  const scheduleSaveReadingProgress = () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(saveReadingProgress, 300)
  }

  const restoreReadingProgress = () => {
    if (initialized) return false
    initialized = true
    const element = container.value
    if (!element || previous?.chapterId !== getChapterId()) return false
    // 显式打开其他小节时优先遵循链接；刷新原地址时恢复精确位置。
    if (getRouteSection() && getRouteSection() !== previous.routeSection) return false
    element.querySelectorAll('details').forEach((details, index) => {
      details.open = previous.openDetails.includes(index)
    })
    const heading = Array.from(element.querySelectorAll<HTMLElement>('[id^="section-"]'))
      .find((item) => item.id === previous.section)
    const top = heading && heading.getClientRects().length
      ? element.scrollTop + heading.getBoundingClientRect().top - element.getBoundingClientRect().top - previous.offset
      : previous.scrollTop
    element.scrollTo({ top, behavior: 'instant' })
    return true
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') saveReadingProgress()
  }

  onMounted(() => {
    window.addEventListener('pagehide', saveReadingProgress)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onBeforeUnmount(() => {
    saveReadingProgress()
    window.removeEventListener('pagehide', saveReadingProgress)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return { restoreReadingProgress, saveReadingProgress, scheduleSaveReadingProgress }
}
