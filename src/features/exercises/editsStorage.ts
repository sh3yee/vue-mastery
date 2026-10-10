import { isEditsData, type EditsData } from '../../../contracts/edits'

export interface EditsStorage {
  read: () => Promise<EditsData>
  canWrite: () => Promise<boolean>
  write: (data: EditsData) => Promise<void>
}

type EditsRequest = (url: string, options?: RequestInit) => Promise<Response>

const isOkResponse = async (response: Response) => {
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return false
  const data: unknown = await response.json()
  return data !== null && typeof data === 'object' && 'ok' in data && data.ok === true
}

export const createEditsStorage = (baseUrl: string, development: boolean, request: EditsRequest = fetch): EditsStorage => ({
  async read() {
    const response = await request(baseUrl + 'runner-edits.json', { cache: 'no-store' })
    if (response.status === 404) return { version: 1, edits: {} }
    if (!response.ok) throw new Error('读取练习存档失败')
    const text = await response.text()
    if (!text.trim()) return { version: 1, edits: {} }
    const data: unknown = JSON.parse(text)
    if (!isEditsData(data)) throw new Error('练习存档格式或版本不受支持')
    return data
  },
  async canWrite() {
    if (!development) return false
    try {
      return await isOkResponse(await request('/__runner-edits', { cache: 'no-store' }))
    } catch { return false }
  },
  async write(data) {
    const response = await request('/__runner-edits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    })
    if (!await isOkResponse(response)) throw new Error('保存练习存档失败')
  },
})
