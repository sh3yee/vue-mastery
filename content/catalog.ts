import type { ChapterDefinition } from '../contracts/content'

// ID 同时用于地址和存档；改标题或移动内容时保持 ID 不变。
export const catalog: ChapterDefinition[] = [
  { kind: 'note', id: 'lexical-scope', title: '词法作用域', group: '基础概念', description: '理解作用域链、词法环境与执行上下文。' },
  { kind: 'note', id: 'closure', title: '闭包', group: '基础概念', description: '理解函数如何记住并访问定义时的变量。' },
  { kind: 'note', id: 'this', title: 'this 绑定', group: '基础概念', description: '从调用方式出发，掌握 this 的绑定规则。' },
  { kind: 'note', id: 'prototype', title: '原型与继承', group: '基础概念', description: '梳理原型链、属性查找、构造函数与继承。' },
  { kind: 'note', id: 'deep-clone', title: '深拷贝', group: '基础概念', description: '从递归到循环引用，掌握常见类型的深拷贝与边界。' },
  { kind: 'note', id: 'call', title: 'call 方法', group: '函数与应用', description: '指定 this，逐个传入参数调用函数。' },
  { kind: 'note', id: 'apply', title: 'apply 方法', group: '函数与应用', description: '使用数组或类数组对象传递调用参数。' },
  { kind: 'note', id: 'call-apply-bind-new', title: '调用与对象创建', group: '函数与应用', description: '逐步手写 call、apply、bind、new、instanceof 与 Object.create。' },
  { kind: 'note', id: 'debounce-throttle', title: '防抖与节流', group: '函数与应用', description: '控制高频事件的执行时机，理解实现与边界。' },
  { kind: 'note', id: 'event-loop', title: '事件循环', group: '异步与调度', description: '理解任务、微任务、调用栈与浏览器渲染。' },
  { kind: 'note', id: 'promise', title: 'Promise', group: '异步与调度', description: '掌握状态、链式调用、错误传播与并发组合。' },
  { kind: 'lab', id: 'promise-event-loop', title: 'Promise + Event Loop 实验', group: '动手实验', description: 'setTimeout / Promise / async-await / Promise.all 等异步执行顺序题。选一道题 → 在编辑器里改/运行代码 → 右侧看输出，再点「显示答案」对照解析。' },
]
