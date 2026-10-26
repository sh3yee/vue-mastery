export interface ReadingProgress {
  version: 1
  chapterId: string
  routeSection: string
  section: string
  offset: number
  scrollTop: number
  openDetails: number[]
}

const storageKey = 'javascript-notes:reading-progress'

export const readReadingProgress = (): ReadingProgress | null => {
  try {
    const value = window.localStorage.getItem(storageKey)
    if (!value) return null
    const progress = JSON.parse(value) as Partial<ReadingProgress> | null
    if (!progress || progress.version !== 1
      || typeof progress.chapterId !== 'string'
      || typeof progress.routeSection !== 'string'
      || typeof progress.section !== 'string'
      || typeof progress.offset !== 'number' || !Number.isFinite(progress.offset)
      || typeof progress.scrollTop !== 'number' || !Number.isFinite(progress.scrollTop) || progress.scrollTop < 0
      || !Array.isArray(progress.openDetails)
      || !progress.openDetails.every((index) => Number.isSafeInteger(index) && index >= 0)) return null
    return progress as ReadingProgress
  } catch {
    // 浏览器禁用存储或记录损坏时，仍允许正常阅读。
    return null
  }
}

export const writeReadingProgress = (progress: ReadingProgress) => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(progress))
  } catch { /* 存储不可用时不打断阅读。 */ }
}
