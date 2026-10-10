import { expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createRenderer, effectScope, h, nextTick, shallowRef } from 'vue'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { catalog } from '../content/catalog'
import type { Chapter, ChapterDefinition } from '../contracts/content'
import { isEditsData, type EditsData } from '../contracts/edits'
import { getChapterHref } from '../src/content/links'
import { resolveChapterLocation } from '../src/app/routes'
import { useChapterContent } from '../src/app/useChapterContent'
import { createExerciseEdits } from '../src/features/exercises/editsState'
import { createEditsStorage } from '../src/features/exercises/editsStorage'
import { useExerciseSession } from '../src/features/exercises/useExerciseSession'
import { renderNote } from '../tooling/markdown/render'
import { notesPlugin } from '../tooling/markdown/plugin'
import { resolveNoteResource } from '../tooling/markdown/resources'
import { checkContent } from './check-content'

const note = catalog.find((chapter) => chapter.kind === 'note')!
const loadedNote = (definition: ChapterDefinition): Chapter => ({ ...definition, kind: 'note', document: { title: null, html: '<p>内容</p>', headings: [] } })

test('现有章节地址与中文小节参数可以往返解析', () => {
  for (const chapter of catalog) {
    expect(resolveChapterLocation(getChapterHref(chapter, '小节 1'), catalog)).toEqual({ chapter, section: '小节 1' })
  }
  expect(resolveChapterLocation('', catalog).chapter).toBe(catalog[0])
  expect(resolveChapterLocation('#/notes/%ZZ', catalog).chapter).toBeNull()
  expect(resolveChapterLocation('#/notes/missing', catalog).chapter).toBeNull()
})

test('快速切换章节时旧请求不能覆盖新结果，失败可重试', async () => {
  const first = catalog[0]!
  const second = catalog[1]!
  const current = shallowRef<ChapterDefinition | null>(first)
  let finishFirst!: (chapter: Chapter) => void
  let fail = true
  const scope = effectScope()
  const state = scope.run(() => useChapterContent(current, async (definition) => {
    if (definition === first) return new Promise<Chapter>((resolve) => { finishFirst = resolve })
    if (fail) throw new Error('暂时失败')
    return loadedNote(definition)
  }))!
  current.value = second
  await nextTick()
  await nextTick()
  expect(state.error.value).toBe('暂时失败')
  fail = false
  state.reload()
  await nextTick()
  await nextTick()
  finishFirst(loadedNote(first))
  await nextTick()
  expect(state.chapter.value?.id).toBe(second.id)
  expect(state.error.value).toBe('')
  expect(state.loading.value).toBe(false)
  scope.stop()
})

test('旧存档恢复后不同专题的编辑保存在同一份数据中', async () => {
  const writes: EditsData[] = []
  const state = createExerciseEdits({
    read: async () => ({ version: 1, edits: { 'promise-event-loop': { '4': '原有修改' } } }),
    canWrite: async () => true,
    write: async (data) => { writes.push(data) },
  }, 1)
  try {
    await state.loadFromFile()
    expect(state.getEdit('promise-event-loop', 4)).toBe('原有修改')
    expect(writes).toHaveLength(0)
    state.setEdit('another-topic', 1, '新修改')
    await Bun.sleep(15)
    expect(writes.at(-1)?.edits).toEqual({ 'promise-event-loop': { '4': '原有修改' }, 'another-topic': { '1': '新修改' } })
    state.removeEdit('another-topic', 1)
    await Bun.sleep(15)
    expect(writes.at(-1)?.edits).toEqual({ 'promise-event-loop': { '4': '原有修改' } })
  } finally { state.dispose() }
})

test('存档写入串行执行，保存期间产生的修改不会丢失', async () => {
  const writes: EditsData[] = []
  let release!: () => void
  const state = createExerciseEdits({
    read: async () => ({ version: 1, edits: {} }),
    canWrite: async () => true,
    write: async (data) => {
      writes.push(data)
      if (writes.length === 1) await new Promise<void>((resolve) => { release = resolve })
    },
  }, 1)
  try {
    await state.loadFromFile()
    state.setEdit('topic', 1, 'first')
    await Bun.sleep(15)
    state.setEdit('topic', 1, 'latest')
    await Bun.sleep(15)
    expect(writes).toHaveLength(1)
    release()
    await Bun.sleep(15)
    expect(writes).toHaveLength(2)
    expect(writes[1]?.edits.topic?.['1']).toBe('latest')
  } finally { state.dispose() }
})

test('无效存档不能被接受，读取失败后禁止覆盖', async () => {
  expect(isEditsData({ version: 1, edits: { a: { '1': 'code' } } })).toBe(true)
  expect(isEditsData({ version: 2, edits: {} })).toBe(false)
  expect(isEditsData({ version: 1, edits: { a: { '1': 42 } } })).toBe(false)
  let writes = 0
  const state = createExerciseEdits({ read: async () => { throw new Error('格式错误') }, canWrite: async () => true, write: async () => { writes++ } }, 1)
  try {
    await state.loadFromFile()
    state.setEdit('topic', 1, 'code')
    await Bun.sleep(15)
    expect(writes).toBe(0)
    expect(state.error.value).toBe('格式错误')
  } finally { state.dispose() }
})

test('预览不探测写入接口，开发接口返回 HTML 不会误判可写', async () => {
  let requests = 0
  const request = (async () => { requests++; return new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) }) as typeof fetch
  expect(await createEditsStorage('/', false, request).canWrite()).toBe(false)
  expect(requests).toBe(0)
  expect(await createEditsStorage('/', true, request).canWrite()).toBe(false)
})

test('Markdown 相对资源进入 Vite 导入，代码块内路径不被修改', async () => {
  const root = await mkdtemp(join(tmpdir(), 'notes-assets-'))
  try {
    const directory = join(root, 'content/notes/example')
    await mkdir(join(directory, 'assets'), { recursive: true })
    const file = join(directory, 'main.md')
    await writeFile(join(directory, 'assets/picture.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
    await writeFile(file, '# Title\n\n![图](assets/picture.svg)')
    const plugin = notesPlugin()
    const config = plugin.configResolved as Function
    config({ root })
    const load = plugin.load as Function
    const output = await load.call({ addWatchFile() {} }, file + '?note') as string
    expect(output).toContain('picture.svg?url')
    expect(output).toContain('import asset0')
    new Bun.Transpiler({ loader: 'js' }).transformSync(output)
    const document = await renderNote('![图](assets/picture.svg)\n\n```js\nconsole.log("assets/picture.svg")\n```', () => '/resolved.svg')
    expect(document.html).toContain('src="/resolved.svg"')
    expect(document.html).toContain('assets/picture.svg')
    expect(() => resolveNoteResource(file, '../../../outside.png', join(root, 'content/notes'))).toThrow()
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('内容检查能发现重复 ID、缺失文件和缺失资源', async () => {
  const root = await mkdtemp(join(tmpdir(), 'notes-content-'))
  try {
    const directory = join(root, 'content/notes/' + note.id)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'main.md'), '# Title\n\n![missing](assets/missing.png)')
    const errors = await checkContent(root, [note, note, { ...note, id: 'missing' }])
    expect(errors.some((error) => error.includes('ID 重复'))).toBe(true)
    expect(errors.some((error) => error.includes('文件不存在'))).toBe(true)
    expect(errors.some((error) => error.includes('资源不存在'))).toBe(true)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('所有 Vue 组件可解析并编译脚本与模板', async () => {
  for await (const file of new Bun.Glob('src/**/*.vue').scan('.')) {
    const { descriptor, errors } = parse(await Bun.file(file).text(), { filename: file })
    expect(errors).toEqual([])
    const script = compileScript(descriptor, { id: file, fs: { fileExists: existsSync, readFile: (file) => readFileSync(file, 'utf8') } })
    const template = compileTemplate({ source: descriptor.template!.content, filename: file, id: file, compilerOptions: { bindingMetadata: script.bindings } })
    expect(template.errors).toEqual([])
  }
})

test('迁移后的静态相对导入都能解析，内容与运行器不反向依赖页面', async () => {
  for (const directory of ['src', 'content', 'contracts', 'tooling', 'scripts']) {
    for await (const file of new Bun.Glob(directory + '/**/*.{ts,vue}').scan('.')) {
      const source = await Bun.file(file).text()
      const script = file.endsWith('.vue') ? parse(source).descriptor.scriptSetup?.content ?? '' : source
      for (const match of script.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
        const imported = match[1]!
        const target = resolve(dirname(file), imported)
        expect([target, target + '.ts', target + '.vue', join(target, 'index.ts')].some(existsSync)).toBe(true)
        const normalized = target.replaceAll('\\', '/')
        if (directory === 'content' || directory === 'contracts') expect(normalized).not.toContain('/src/')
        if (file.replaceAll('\\', '/').startsWith('src/shared/')) expect(normalized).not.toContain('/features/')
        if (directory === 'src') expect(normalized).not.toContain('/tooling/')
      }
    }
  }
})

test('切题会保存修改，暂时重置不会删除存档，再次编辑会恢复保存', async () => {
  const edits = createExerciseEdits({
    read: async () => ({ version: 1, edits: { topic: { '1': 'saved' } } }),
    canWrite: async () => false,
    write: async () => {},
  })
  const question = (id: number) => ({ id, title: '题目', group: '分组', code: 'original' + id, expected: '', explanation: '' })
  const first = question(1)
  const second = question(2)
  const topic = { id: 'topic', name: '专题', description: '', questions: [first, second] }
  type HostNode = { children: HostNode[] }
  const renderer = createRenderer<HostNode, HostNode>({
    createElement: () => ({ children: [] }),
    createText: () => ({ children: [] }),
    createComment: () => ({ children: [] }),
    insert: (node, parent) => { parent.children.push(node) },
    remove: () => {},
    setText: () => {},
    setElementText: () => {},
    parentNode: () => null,
    nextSibling: () => null,
    patchProp: () => {},
  })
  let session!: ReturnType<typeof useExerciseSession>
  const app = renderer.createApp({ setup() { session = useExerciseSession(() => topic, edits); return () => h('div') } })
  app.mount({ children: [] })
  try {
    await edits.loadFromFile()
    await nextTick()
    expect(session.code.value).toBe('saved')
    session.handleReset()
    session.loadQuestion(second)
    expect(edits.getEdit('topic', 1)).toBe('saved')
    session.loadQuestion(first)
    expect(session.code.value).toBe('saved')
    session.handleReset()
    session.code.value = 'new edit'
    session.loadQuestion(second)
    expect(edits.getEdit('topic', 1)).toBe('new edit')
  } finally { app.unmount(); edits.dispose() }
})
