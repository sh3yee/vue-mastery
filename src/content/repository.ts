import { catalog } from '../../content/catalog'
import type { Chapter, ChapterDefinition, NoteDocument, Question } from '../../contracts/content'

const notes = import.meta.glob<NoteDocument>('../../content/notes/*/main.md', {
  query: '?note',
  import: 'default',
})
const exercises = import.meta.glob<Question[]>('../../content/exercises/*.ts', { import: 'default' })

export const chapters = catalog
export const chapterGroups = [...new Set(chapters.map((chapter) => chapter.group))].map((name) => ({
  name,
  chapters: chapters.filter((chapter) => chapter.group === name),
}))

export const loadChapter = async (chapter: ChapterDefinition): Promise<Chapter> => {
  if (chapter.kind === 'note') {
    const load = notes['../../content/notes/' + chapter.id + '/main.md']
    if (!load) throw new Error('笔记文件不存在：' + chapter.id)
    return { ...chapter, document: await load() }
  }
  const load = exercises['../../content/exercises/' + chapter.id + '.ts']
  if (!load) throw new Error('实验文件不存在：' + chapter.id)
  return {
    ...chapter,
    topic: { id: chapter.id, name: chapter.title.replace(/ 实验$/, ''), description: chapter.description, questions: await load() },
  }
}
