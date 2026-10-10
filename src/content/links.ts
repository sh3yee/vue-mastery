import type { ChapterDefinition } from '../../contracts/content'

export const getChapterHref = (chapter: ChapterDefinition, section = '') => {
  const query = section ? '?section=' + encodeURIComponent(section) : ''
  return '#/' + (chapter.kind === 'note' ? 'notes' : 'lab') + '/' + encodeURIComponent(chapter.id) + query
}

