import { topics } from '../topics'
import type { Chapter, NoteDocument } from './types'

const documents = import.meta.glob<NoteDocument>('../*/main.md', {
  eager: true,
  query: '?note',
  import: 'default',
})

const noteDefinitions = [
  { id: 'lexical-scope', title: '词法作用域', group: '基础概念', description: '理解作用域链、词法环境与执行上下文。' },
  { id: 'closure', title: '闭包', group: '基础概念', description: '理解函数如何记住并访问定义时的变量。' },
  { id: 'this', title: 'this 绑定', group: '基础概念', description: '从调用方式出发，掌握 this 的绑定规则。' },
  { id: 'prototype', title: '原型与继承', group: '基础概念', description: '梳理原型链、属性查找、构造函数与继承。' },
  { id: 'deep-clone', title: '深拷贝', group: '基础概念', description: '从递归到循环引用，掌握常见类型的深拷贝与边界。' },
  { id: 'call', title: 'call 方法', group: '函数与应用', description: '指定 this，逐个传入参数调用函数。' },
  { id: 'apply', title: 'apply 方法', group: '函数与应用', description: '使用数组或类数组对象传递调用参数。' },
  { id: 'call-apply-bind-new', title: '调用与对象创建', group: '函数与应用', description: '逐步手写 call、apply、bind、new、instanceof 与 Object.create。' },
  { id: 'debounce-throttle', title: '防抖与节流', group: '函数与应用', description: '控制高频事件的执行时机，理解实现与边界。' },
  { id: 'event-loop', title: '事件循环', group: '异步与调度', description: '理解任务、微任务、调用栈与浏览器渲染。' },
  { id: 'promise', title: 'Promise', group: '异步与调度', description: '掌握状态、链式调用、错误传播与并发组合。' },
]

export const chapters: Chapter[] = [
  ...noteDefinitions.map((definition): Chapter => {
    const document = documents[`../${definition.id}/main.md`]
    if (!document) throw new Error(`笔记文件不存在：${definition.id}/main.md`)
    return { ...definition, kind: 'note', document }
  }),
  ...topics.map((topic): Chapter => ({
    id: topic.id,
    kind: 'lab',
    title: `${topic.name} 实验`,
    description: topic.description ?? '选择题目，运行代码，对照答案理解执行过程。',
    group: '动手实验',
    topic,
  })),
]

export const chapterGroups = [...new Set(chapters.map((chapter) => chapter.group))].map((name) => ({
  name,
  chapters: chapters.filter((chapter) => chapter.group === name),
}))

export const getChapterHref = (chapter: Chapter, section = '') => {
  const query = section ? `?section=${encodeURIComponent(section)}` : ''
  return `#/${chapter.kind === 'note' ? 'notes' : 'lab'}/${encodeURIComponent(chapter.id)}${query}`
}
