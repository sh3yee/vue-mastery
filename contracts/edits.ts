export interface EditsData {
  version: 1
  edits: Record<string, Record<string, string>>
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export const isEditsData = (value: unknown): value is EditsData => {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.edits)) return false
  return Object.values(value.edits).every((topic) => isRecord(topic) && Object.values(topic).every((code) => typeof code === 'string'))
}
