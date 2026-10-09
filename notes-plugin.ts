import type { Plugin } from 'vite'
import type { NoteDocument, NoteHeading } from './src/notes/types'
import { highlightCode } from './notes-code-highlight'

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del',
  'a', 'img', 'pre', 'code', 'blockquote', 'ul', 'ol', 'li', 'table', 'thead',
  'tbody', 'tr', 'th', 'td', 'details', 'summary', 'input', 'figure', 'figcaption', 'div', 'span',
])
const DIAGRAM_CLASSES = new Set([
  'ref-diagram', 'ref-heading', 'ref-row', 'ref-sources', 'ref-name',
  'ref-arrow', 'ref-object', 'ref-title', 'ref-value', 'ref-loop',
])
const HIDDEN_TAGS = new Set(['script', 'style', 'iframe', 'object', 'svg', 'math'])
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title'],
  code: ['class'],
  ol: ['start'],
  th: ['align'],
  td: ['align'],
  input: ['type', 'checked', 'disabled'],
  figure: ['class'],
  figcaption: ['class'],
  div: ['class'],
  span: ['class'],
}

const isSafeUrl = (value: string) => {
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(value, 'https://notes.local').protocol)
  } catch {
    return false
  }
}

export const renderNote = async (source: string): Promise<NoteDocument> => {
  const headings: NoteHeading[] = []
  const codeBlocks: string[] = []
  // 从 Markdown 语法树提取标题，代码块里的 # 不会被误识别为目录。
  Bun.markdown.render(source, {
    heading: (text, { level }) => {
      headings.push({ id: `section-${headings.length + 1}`, text, level })
      return ''
    },
    code: (text, meta) => {
      codeBlocks.push(highlightCode(text, meta?.language))
      return ''
    },
  })

  const firstHeading = headings[0]
  const hasTitle = firstHeading?.level === 1
  let headingIndex = 0
  let codeIndex = 0
  const html = await new HTMLRewriter()
    .on('*', {
      element(element) {
        const tag = element.tagName
        if (!ALLOWED_TAGS.has(tag)) {
          if (HIDDEN_TAGS.has(tag)) element.remove()
          else element.removeAndKeepContent()
          return
        }

        // 保留笔记中的折叠答案，移除原始 HTML 的事件和无关属性。
        for (const [name] of Array.from(element.attributes)) {
          if (!ALLOWED_ATTRIBUTES[tag]?.includes(name)) element.removeAttribute(name)
        }
        // 图示仅保留预定义的样式类，仍不允许内联样式和事件。
        if (['figure', 'figcaption', 'div', 'span'].includes(tag)) {
          const classes = (element.getAttribute('class') ?? '').split(/\s+/).filter((name) => DIAGRAM_CLASSES.has(name))
          if (classes.length) element.setAttribute('class', classes.join(' '))
          else element.removeAttribute('class')
        }
        for (const attribute of ['href', 'src']) {
          const value = element.getAttribute(attribute)
          if (value !== null) {
            if (isSafeUrl(value)) element.setAttribute(attribute, value)
            else element.removeAttribute(attribute)
          }
        }
        if (tag === 'a' && /^https?:\/\//i.test(element.getAttribute('href') ?? '')) {
          element.setAttribute('target', '_blank')
          element.setAttribute('rel', 'noopener noreferrer')
        }
        if (tag === 'code' && !/^language-[\w+-]+$/.test(element.getAttribute('class') ?? '')) {
          element.removeAttribute('class')
        }
        if (tag === 'input') {
          if (element.getAttribute('type') !== 'checkbox') element.remove()
          else element.setAttribute('disabled', '')
        }
        if (tag === 'img') element.setAttribute('loading', 'lazy')
      },
    })
    .on('h1, h2, h3, h4, h5, h6', {
      element(element) {
        const heading = headings[headingIndex++]
        if (!heading) return
        if (hasTitle && heading === firstHeading) {
          element.remove()
          return
        }
        // 用稳定编号处理中文标题和重复标题，避免空锚点或锚点冲突。
        element.setAttribute('id', heading.id)
      },
    })
    .on('pre', {
      element(element) {
        element.before('<div class="note-code-block"><button class="copy-code" type="button" data-copy-code>复制代码</button>', { html: true })
        element.after('</div>', { html: true })
      },
    })
    .on('pre code', {
      element(element) {
        const highlighted = codeBlocks[codeIndex++]
        if (highlighted !== undefined) element.setInnerContent(highlighted, { html: true })
      },
    })
    .transform(new Response(Bun.markdown.html(source, { tagFilter: true })))
    .text()

  return {
    title: hasTitle ? firstHeading.text : null,
    html,
    headings: hasTitle ? headings.slice(1) : headings,
  }
}

export const notesPlugin = (): Plugin => ({
  name: 'notes-markdown',
  enforce: 'pre',
  async load(id) {
    const [file, query = ''] = id.split('?')
    if (!file?.endsWith('.md') || !new URLSearchParams(query).has('note')) return
    this.addWatchFile(file)
    const note = await renderNote(await Bun.file(file).text())
    return `export default ${JSON.stringify(note)}`
  },
})
