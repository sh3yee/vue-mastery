import ts from 'typescript'

const SUPPORTED_LANGUAGES = new Set(['js', 'javascript', 'ts', 'typescript', 'json'])
const classifier = ts.createClassifier()
const TOKEN_CLASSES: Partial<Record<ts.ClassificationType, string>> = {
  [ts.ClassificationType.comment]: 'comment',
  [ts.ClassificationType.keyword]: 'keyword',
  [ts.ClassificationType.numericLiteral]: 'number',
  [ts.ClassificationType.bigintLiteral]: 'number',
  [ts.ClassificationType.stringLiteral]: 'string',
  [ts.ClassificationType.regularExpressionLiteral]: 'string',
  [ts.ClassificationType.identifier]: 'identifier',
}

export const highlightCode = (source: string, language = '') => {
  if (!SUPPORTED_LANGUAGES.has(language.toLowerCase())) return Bun.escapeHTML(source)

  // 复用 TypeScript 的词法分析，正确区分注释、正则和模板字符串。
  const { spans } = classifier.getEncodedLexicalClassifications(source, ts.EndOfLineState.None, true)
  const fragments: string[] = []
  let position = 0

  for (let index = 0; index < spans.length; index += 3) {
    const start = spans[index]!
    const length = spans[index + 1]!
    const type = spans[index + 2]! as ts.ClassificationType
    const className = TOKEN_CLASSES[type]
    fragments.push(Bun.escapeHTML(source.slice(position, start)))
    const text = Bun.escapeHTML(source.slice(start, start + length))
    fragments.push(className ? `<span class="syntax-${className}">${text}</span>` : text)
    position = start + length
  }

  fragments.push(Bun.escapeHTML(source.slice(position)))
  return fragments.join('')
}
