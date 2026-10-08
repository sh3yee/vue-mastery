import type { Topic } from '../runner/types'

export interface NoteHeading {
  id: string
  text: string
  level: number
}

export interface NoteDocument {
  title: string | null
  html: string
  headings: NoteHeading[]
}

interface ChapterInfo {
  id: string
  title: string
  description: string
  group: string
}

export interface NoteChapter extends ChapterInfo {
  kind: 'note'
  document: NoteDocument
}

export interface LabChapter extends ChapterInfo {
  kind: 'lab'
  topic: Topic
}

export type Chapter = NoteChapter | LabChapter
