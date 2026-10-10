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

export interface Question {
  id: number
  group: string
  title: string
  code: string
  expected: string
  explanation: string
}

export interface Topic {
  id: string
  name: string
  description: string
  questions: Question[]
}

export interface ChapterInfo {
  id: string
  title: string
  description: string
  group: string
}

export interface NoteDefinition extends ChapterInfo {
  kind: 'note'
}

export interface LabDefinition extends ChapterInfo {
  kind: 'lab'
}

export type ChapterDefinition = NoteDefinition | LabDefinition
export interface NoteChapter extends NoteDefinition { document: NoteDocument }
export interface LabChapter extends LabDefinition { topic: Topic }
export type Chapter = NoteChapter | LabChapter
