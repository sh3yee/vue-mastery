import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

export const resolveNoteResource = (noteFile: string, url: string, notesRoot: string) => {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('/') || url.startsWith('#')) return null
  const pathname = url.split(/[?#]/)[0]
  if (!pathname) return null
  const decoded = decodeURIComponent(pathname)
  const file = resolve(dirname(noteFile), decoded)
  const within = relative(notesRoot, file)
  if (isAbsolute(within) || within === '..' || within.startsWith('..' + sep)) {
    throw new Error('笔记资源必须位于 content/notes 内：' + url)
  }
  return { file, suffix: url.slice(pathname.length) }
}
