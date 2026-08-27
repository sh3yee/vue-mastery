// 运行器使用的通用数据类型，与具体专题无关。

export interface Question {
  id: number
  group: string // 侧边栏分组名（专题内的考点分类）
  title: string
  code: string
  expected: string
  explanation: string
}

export interface Topic {
  id: string
  name: string
  description?: string
  questions: Question[]
}