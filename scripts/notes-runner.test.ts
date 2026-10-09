import { expect, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import { workerSource } from '../src/runner/workerSource'
import { renderNote } from '../notes-plugin'
import { createHtmlPreview } from '../src/runner/htmlPreview'

const execute = (code: string) => {
  const messages: { type: string; text?: string; level?: string }[] = []
  const context = {
    self: {} as Record<string, unknown>,
    setTimeout: () => 1,
    clearTimeout: () => {},
    postMessage: (message: (typeof messages)[number]) => messages.push(message),
    addEventListener: () => {},
  }
  context.self = context
  runInNewContext(workerSource, context)
  const receive = context.self.onmessage as (event: { data: { type: string; code: string } }) => void
  receive({ data: { type: 'run', code } })
  return messages.filter((message) => message.type === 'log')
}

test('循环引用可读，共享引用不会被误标为循环', () => {
  const result = execute(`
    const shared = { value: 1 }
    const source = { first: shared, second: shared }
    source.self = source
    console.log(source)
  `)
  expect(JSON.parse(result[0]!.text!)).toEqual({ first: { value: 1 }, second: { value: 1 }, self: '[Circular]' })
})

test('截图中的引用判断输出两个 true', () => {
  expect(execute(`const source = { name: '小明' }; source.self = source;
    console.log(source.self === source); console.log(source.self.self === source)`)
    .map((line) => line.text)).toEqual(['true', 'true'])
})

test('未定义变量和语法错误显示为运行错误', () => {
  expect(execute('console.log(missingValue)')[0]?.level).toBe('error')
  expect(execute('const =')[0]?.level).toBe('error')
})

test('每次运行拥有独立的变量作用域', () => {
  execute('const example = 123')
  expect(execute('console.log(typeof example)')[0]?.text).toBe('undefined')
})

test('HTML 预览保留页面内容，并转发日志和按钮提示', () => {
  const source = '<button onclick="alert(this.tagName)">运行</button>'
  const html = createHtmlPreview(source)
  expect(html).toContain(source)
  const messages: unknown[] = []
  const context = {
    window: {} as Record<string, unknown>,
    console: {},
    parent: { postMessage: (message: unknown) => messages.push(message) },
    addEventListener: () => {},
  }
  context.window = context
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)![1]!, context)
  runInNewContext("console.log('hello'); alert('BUTTON')", context)
  expect(messages).toEqual([
    { type: 'note-preview-log', level: 'log', text: 'hello' },
    { type: 'note-preview-log', level: 'info', text: 'BUTTON' },
  ])
})

test('所有章节的围栏代码块都保留交互挂载点，包括折叠块', async () => {
  let total = 0
  for await (const path of new Bun.Glob('src/*/main.md').scan('.')) {
    const source = await Bun.file(path).text()
    let count = 0
    Bun.markdown.render(source, { code: () => { count += 1; return '' } })
    const document = await renderNote(source)
    expect(document.html.match(/class="note-code-block"/g)?.length ?? 0).toBe(count)
    total += count
  }
  expect(total).toBeGreaterThan(0)
  console.log(`已检查 ${total} 个代码块`)
})

test('对象关系图渲染为 HTML 图示，不生成代码运行入口', async () => {
  const document = await renderNote(await Bun.file('src/deep-clone/main.md').text())
  const figures = document.html.match(/<figure class="ref-diagram">[\s\S]*?<\/figure>/g) ?? []
  expect(figures).toHaveLength(7)
  for (const figure of figures) {
    expect(figure).toContain('class="ref-object"')
    expect(figure).toContain('<figcaption>')
    expect(figure).not.toContain('note-code-block')
  }
})

test('HTML 图示仅保留允许的样式类，移除事件与内联样式', async () => {
  const document = await renderNote('<figure class="ref-diagram unknown" onclick="alert(1)" style="color:red"><div class="ref-object note-code-block">对象 A</div><script>alert(1)</script></figure>')
  expect(document.html).toContain('class="ref-diagram"')
  expect(document.html).toContain('class="ref-object"')
  expect(document.html).not.toMatch(/onclick|style=|unknown|note-code-block|<script/)
})
