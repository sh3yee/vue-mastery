import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { renderNote } from './render'
import { resolveNoteResource } from './resources'

export const notesPlugin = (): Plugin => {
  let notesRoot = ''
  return {
    name: 'notes-markdown',
    enforce: 'pre',
    configResolved(config) { notesRoot = resolve(config.root, 'content/notes') },
    async load(id) {
      const [file, query = ''] = id.split('?')
      if (!file?.endsWith('.md') || !new URLSearchParams(query).has('note')) return
      this.addWatchFile(file)
      const assets: { token: string; file: string; suffix: string }[] = []
      const note = await renderNote(await Bun.file(file).text(), (url) => {
        const resource = resolveNoteResource(file, url, notesRoot)
        if (!resource) return url
        const token = '__NOTE_RESOURCE_' + assets.length + '__'
        assets.push({ token, ...resource })
        return token
      })
      for (const asset of assets) {
        if (!await Bun.file(asset.file).exists()) throw new Error('笔记资源不存在：' + asset.file)
        this.addWatchFile(asset.file)
      }
      const imports = assets.map((asset, index) => 'import asset' + index + ' from ' + JSON.stringify(asset.file.replaceAll('\\', '/') + '?url')).join('\n')
      const replacements = assets.map((asset, index) => 'note.html = note.html.replaceAll(' + JSON.stringify(asset.token) + ', escapeAttribute(asset' + index + ' + ' + JSON.stringify(asset.suffix) + '))').join('\n')
      const escape = 'const escapeAttribute = (value) => value.replaceAll("&", "&amp;").replaceAll(String.fromCharCode(34), "&quot;").replaceAll("<", "&lt;")'
      return [imports, 'const note = ' + JSON.stringify(note), escape, replacements, 'export default note'].join('\n')
    },
  }
}
