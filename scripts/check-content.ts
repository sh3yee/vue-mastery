import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { catalog } from '../content/catalog'
import type { ChapterDefinition, Question } from '../contracts/content'
import { renderNote } from '../tooling/markdown/render'
import { resolveNoteResource } from '../tooling/markdown/resources'

export const checkContent = async (root: string, chapters: ChapterDefinition[] = catalog) => {
  const errors: string[] = []
  const ids = new Set<string>()
  const registered = new Set<string>()
  if (!chapters.length) errors.push('章节目录不能为空')
  for (const chapter of chapters) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapter.id)) {
      errors.push('章节 ID 无效：' + chapter.id)
      continue
    }
    if (ids.has(chapter.id)) errors.push('章节 ID 重复：' + chapter.id)
    ids.add(chapter.id)
    if (![chapter.title, chapter.group, chapter.description].every((value) => typeof value === 'string' && value.trim())) {
      errors.push('章节信息不完整：' + chapter.id)
    }
    const relative = chapter.kind === 'note' ? 'content/notes/' + chapter.id + '/main.md' : 'content/exercises/' + chapter.id + '.ts'
    registered.add(relative)
    const file = resolve(root, relative)
    try {
      if (!await Bun.file(file).exists()) throw new Error('文件不存在：' + relative)
      if (chapter.kind === 'note') {
        const resources: string[] = []
        const document = await renderNote(await Bun.file(file).text(), (url) => {
          const resource = resolveNoteResource(file, url, resolve(root, 'content/notes'))
          if (resource) resources.push(resource.file)
          return url
        })
        if (!document.html.trim()) errors.push('笔记正文为空：' + relative)
        for (const resource of resources) {
          if (!await Bun.file(resource).exists()) errors.push('笔记资源不存在：' + resource)
        }
      } else {
        const { default: questions } = await import(pathToFileURL(file).href) as { default: Question[] }
        if (!Array.isArray(questions) || !questions.length) throw new Error('实验必须导出非空题目数组：' + relative)
        const questionIds = new Set<number>()
        for (const question of questions) {
          if (!question || !Number.isSafeInteger(question.id) || question.id < 1) throw new Error('题目 ID 必须为正整数：' + relative)
          if (questionIds.has(question.id)) errors.push('题目 ID 重复：' + chapter.id + '/' + question.id)
          questionIds.add(question.id)
          if (![question.group, question.title, question.code, question.expected, question.explanation].every((value) => typeof value === 'string')) {
            errors.push('题目字段必须是字符串：' + chapter.id + '/' + question.id)
          }
        }
      }
    } catch (cause) { errors.push(cause instanceof Error ? cause.message : String(cause)) }
  }
  for (const pattern of ['content/notes/*/main.md', 'content/exercises/*.ts']) {
    for await (const file of new Bun.Glob(pattern).scan({ cwd: root })) {
      if (!registered.has(file.replaceAll('\\', '/'))) errors.push('内容未注册：' + file)
    }
  }
  return errors
}

if (import.meta.main) {
  const errors = await checkContent(resolve(import.meta.dir, '..'))
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else console.log('内容校验通过：' + catalog.length + ' 个章节')
}
