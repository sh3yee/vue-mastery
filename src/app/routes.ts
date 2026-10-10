import type { ChapterDefinition } from '../../contracts/content'

export const resolveChapterLocation = (hash: string, chapters: ChapterDefinition[]) => {
  const [path = '', query = ''] = hash.replace(/^#/, '').split('?')
  const [, kind, encodedId = ''] = path.split('/')
  let id = ''
  try { id = decodeURIComponent(encodedId) } catch { /* 非法编码按未知章节处理。 */ }
  const isEmpty = path === '' || path === '/'
  const chapter = isEmpty ? chapters[0] : chapters.find((item) => item.id === id && (item.kind === 'note' ? kind === 'notes' : kind === 'lab'))
  return { chapter: chapter ?? null, section: new URLSearchParams(query).get('section') ?? '' }
}
