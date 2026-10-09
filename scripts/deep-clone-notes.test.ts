import { expect, test } from 'bun:test'

const source = await Bun.file('src/deep-clone/main.md').text()
const examples: string[] = []
Bun.markdown.render(source, {
  code: (code, meta) => {
    if (['js', 'javascript'].includes(meta?.language ?? '')) examples.push(code)
    return ''
  },
})

const runExample = (code: string) => {
  const output: string[] = []
  // 每块使用单独函数作用域，与页面不共享变量的行为一致。
  new Function('console', code)({ log: (...values: unknown[]) => output.push(values.map(String).join(' ')) })
  return output
}

for (const [index, code] of examples.entries()) {
  test(`深拷贝示例 ${index + 1} 可独立运行，输出符合注释`, () => {
    const output = runExample(code)
    const logLines = code.split('\n').filter((line) => /^\s*console\.log\(/.test(line))
    expect(output).toHaveLength(logLines.length)
    for (const [lineIndex, line] of logLines.entries()) {
      const comment = line.match(/\)\s*\/\/\s*(.+)$/)?.[1]
      if (!comment) continue
      const expected = comment.split('：')[0]!.trim()
      expect(output[lineIndex]).toBe(expected)
    }
  })
}

test('第一阶段的预测题与折叠答案一致', () => {
  const chapter = source.split('## 六、第一阶段练习：')[1]!.split('## 七、')[0]!
  const exercises = [...chapter.matchAll(/```js\r?\n([\s\S]*?)```/g)].map((match) => match[1]!)
  expect(exercises).toHaveLength(2)
  expect(runExample(exercises[0]!)).toEqual(['小明', '100'])
  expect(runExample(exercises[1]!)).toEqual(['2', '1', 'true', 'false'])
})
