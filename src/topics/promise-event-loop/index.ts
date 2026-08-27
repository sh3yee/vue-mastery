import type { Question, Topic } from '../../runner/types'

// Promise + Event Loop 输出题专项：20 道题，按 8 个考点分组。
// 预期输出均经手工推导，可用运行器复核。

const questions: Question[] = [
  // ── setTimeout + Promise ─────────────────────────────────────────
  {
    id: 1,
    group: 'setTimeout + Promise',
    title: '同步 / 微任务 / 宏任务 经典顺序',
    code: `console.log('start')

setTimeout(() => {
  console.log('timeout')
}, 0)

Promise.resolve().then(() => {
  console.log('promise')
})

console.log('end')`,
    expected: `start
end
promise
timeout`,
    explanation:
      '同步代码先跑完（start、end）；然后清空微任务队列（promise）；最后才执行宏任务 setTimeout（timeout）。优先级：同步 > 微任务 > 宏任务。',
  },
  {
    id: 2,
    group: 'setTimeout + Promise',
    title: '嵌套 setTimeout 内产生微任务',
    code: `setTimeout(() => {
  console.log('A')
  Promise.resolve().then(() => console.log('B'))
}, 0)

setTimeout(() => {
  console.log('C')
}, 0)`,
    expected: `A
B
C`,
    explanation:
      '第 1 个 setTimeout 回调执行时输出 A，并在本轮产生微任务 B；该回调结束后立即清空本轮微任务 → B；然后才进入第 2 个宏任务 → C。一轮事件循环 = 一个宏任务 + 清空它产生的所有微任务。',
  },
  {
    id: 3,
    group: 'setTimeout + Promise',
    title: '多个 setTimeout 多轮事件循环',
    code: `console.log('1')

setTimeout(() => console.log('2'), 0)

Promise.resolve().then(() => console.log('3'))

Promise.resolve().then(() => {
  setTimeout(() => console.log('4'), 0)
})

Promise.resolve().then(() => console.log('5'))

setTimeout(() => console.log('6'), 0)

console.log('7')`,
    expected: `1
7
3
5
2
6
4`,
    explanation:
      '同步输出 1、7；微任务队列 [3, 登记setTimeout4, 5]，清空时输出 3、5，并把 4 登记为新的宏任务；已就绪的宏任务队列原为 [2, 6]，现在 4 排到它们后面，依次输出 2、6、4。',
  },

  // ── async/await + Promise ────────────────────────────────────────
  {
    id: 4,
    group: 'async/await + Promise',
    title: '经典 async1 / async2 / script start',
    code: `async function async1() {
  console.log('async1 start')
  await async2()
  console.log('async1 end')
}

async function async2() {
  console.log('async2')
}

console.log('script start')

setTimeout(() => {
  console.log('setTimeout')
}, 0)

async1()

new Promise((resolve) => {
  console.log('promise')
  resolve()
}).then(() => {
  console.log('then')
})

console.log('script end')`,
    expected: `script start
async1 start
async2
promise
script end
async1 end
then
setTimeout`,
    explanation:
      'await async2() 会暂停 async1，async2 先同步输出；async1 end 作为微任务排队（现代浏览器对 await 已 settle 的 Promise 只排一个微任务），它比 new Promise 的 then 先入队，所以 async1 end 在 then 之前；setTimeout 是宏任务最后输出。',
  },
  {
    id: 5,
    group: 'async/await + Promise',
    title: 'await 后续代码与 then 的入队顺序',
    code: `async function foo() {
  console.log('A')
  await Promise.resolve()
  console.log('B')
}

console.log('C')
foo()
console.log('D')
Promise.resolve().then(() => console.log('E'))`,
    expected: `C
A
D
B
E`,
    explanation:
      'foo() 里 A 同步输出；await 把 B 作为微任务入队；回到主流程输出 D；再注册 then(E)。微任务队列顺序是 [B, E]（B 比 E 先入队），所以先 B 后 E。',
  },
  {
    id: 6,
    group: 'async/await + Promise',
    title: 'async 函数返回值与 then',
    code: `async function f() {
  return 10
}

f().then((v) => console.log('then1:', v))

Promise.resolve().then(() => console.log('then2'))`,
    expected: `then1: 10
then2`,
    explanation:
      'async 函数 return 10，其返回的 Promise 以 10 为值敲定（非 thenable，同步敲定）。f().then 的回调先入队，then2 后入队，按微任务顺序执行。',
  },

  // ── Promise 链式调用 ─────────────────────────────────────────────
  {
    id: 7,
    group: 'Promise 链式调用',
    title: '值沿链传递',
    code: `Promise.resolve(2)
  .then((v) => v * 3)
  .then((v) => Promise.resolve(v + 1))
  .then((v) => {
    console.log(v)
  })`,
    expected: `7`,
    explanation:
      '2 * 3 = 6（普通值传递）；第二个 then 返回 Promise，会被展开等待，下一个 then 拿到 6 + 1 = 7。',
  },
  {
    id: 8,
    group: 'Promise 链式调用',
    title: '两条链交替执行',
    code: `Promise.resolve()
  .then(() => console.log(1))
  .then(() => console.log(2))
  .then(() => console.log(3))

Promise.resolve()
  .then(() => console.log(4))
  .then(() => console.log(5))
  .then(() => console.log(6))`,
    expected: `1
4
2
5
3
6`,
    explanation:
      '两条独立链各自把下一环作为微任务入队，按入队顺序交替：第一轮 1、4；每执行一环就把它后继入队，于是 2、5、3、6 依次产出。',
  },

  // ── Promise 错误捕获 ─────────────────────────────────────────────
  {
    id: 9,
    group: 'Promise 错误捕获',
    title: '抛错跳过中间 then，直达 catch',
    code: `Promise.resolve(1)
  .then((v) => {
    console.log('first:', v)
    throw new Error('boom')
  })
  .then(() => console.log('second'))
  .catch((e) => console.log('caught:', e.message))
  .then(() => console.log('after'))`,
    expected: `first: 1
caught: boom
after`,
    explanation:
      '第一个 then 输出 first: 1 后抛错，错误跳过中间所有 then，直达最近的 catch；catch 处理后链恢复正常，后面 then 照常执行（拿到 undefined）。',
  },
  {
    id: 10,
    group: 'Promise 错误捕获',
    title: 'catch 之后链恢复',
    code: `Promise.reject(new Error('failed'))
  .then(() => console.log('skipped'))
  .catch((e) => {
    console.log('caught:', e.message)
    return 'recovered'
  })
  .then((v) => console.log('recovered:', v))`,
    expected: `caught: failed
recovered: recovered`,
    explanation:
      'reject 跳过 then，被 catch 接住输出 caught: failed；catch return 的值成为下一个 then 的入参，所以 recovered: recovered。',
  },
  {
    id: 11,
    group: 'Promise 错误捕获',
    title: 'then(f, g) 捕获不到 f 内部的错',
    code: `Promise.resolve(1)
  .then(
    (v) => {
      console.log('ok:', v)
      throw new Error('inner error')
    },
    (e) => console.log('handler caught:', e.message)
  )
  .then(() => console.log('next'))`,
    expected: `ok: 1
Unhandled Promise Rejection: Error: inner error`,
    explanation:
      'then 的第二个参数 g 只守"上游 reject"这道门，捕获不到成功回调 f 内部抛的错。f 抛的错属于 then 返回的新 Promise，会沿链向后传播；链尾没有 catch，最终触发 unhandledrejection。',
  },

  // ── then 返回普通值 ─────────────────────────────────────────────
  {
    id: 12,
    group: 'then 返回普通值',
    title: '返回值成为下一个 then 的入参',
    code: `Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => {
    console.log(v)
    return v * 2
  })
  .then((v) => console.log(v))`,
    expected: `2
4`,
    explanation:
      '第一个 then 返回普通值 2，下一个 then 拿到 2 并输出，再 return 4，最后一个 then 输出 4。',
  },
  {
    id: 13,
    group: 'then 返回普通值',
    title: '没有 return 就传 undefined',
    code: `Promise.resolve('hello')
  .then((v) => {
    console.log('got:', v)
  })
  .then((v) => {
    console.log('next:', v)
  })`,
    expected: `got: hello
next: undefined`,
    explanation:
      '第一个 then 拿到 hello 并输出，但没有 return，默认返回 undefined，下一个 then 因此拿到 undefined。',
  },

  // ── then 返回 Promise ───────────────────────────────────────────
  {
    id: 14,
    group: 'then 返回 Promise',
    title: '返回的 Promise 被展开等待',
    code: `Promise.resolve()
  .then(() => {
    return new Promise((resolve) => setTimeout(() => resolve('inner'), 0))
  })
  .then((v) => console.log('outer:', v))

console.log('sync')`,
    expected: `sync
outer: inner`,
    explanation:
      'then 回调返回一个 Promise，链会等它敲定再继续；它内部用 setTimeout(0) 异步 resolve，所以 outer: inner 在 sync 之后、且要等一个宏任务才输出。',
  },
  {
    id: 15,
    group: 'then 返回 Promise',
    title: 'resolve 一个 Promise 会被自动展开',
    code: `const inner = Promise.resolve(42)

const p = new Promise((resolve) => resolve(inner))

p.then((v) => console.log('got:', v))

console.log('sync end')`,
    expected: `sync end
got: 42`,
    explanation:
      'resolve 传入一个 Promise 会被自动展开——p 不会以 Promise 对象为值，而是采用 inner 的结果 42。展开发生在微任务里，所以 got: 42 在 sync end 之后。若不想被展开，可包一层对象：resolve({ promise: inner })。',
  },

  // ── Promise.all 输出顺序 ─────────────────────────────────────────
  {
    id: 16,
    group: 'Promise.all 输出顺序',
    title: '结果顺序与完成先后无关',
    code: `const p1 = new Promise((resolve) => setTimeout(() => resolve('p1'), 30))
const p2 = new Promise((resolve) => setTimeout(() => resolve('p2'), 10))
const p3 = new Promise((resolve) => setTimeout(() => resolve('p3'), 20))

Promise.all([p1, p2, p3]).then((results) => console.log(results.join(',')))`,
    expected: `p1,p2,p3`,
    explanation:
      'p2 最先完成、p3 次之、p1 最慢，但 Promise.all 的结果数组按传入顺序排列，与完成先后无关，所以输出 p1,p2,p3。',
  },
  {
    id: 17,
    group: 'Promise.all 输出顺序',
    title: '任一失败立即 reject',
    code: `const p1 = new Promise((resolve) => setTimeout(() => resolve('p1'), 50))
const p2 = Promise.reject('p2 failed')
const p3 = new Promise((resolve) => setTimeout(() => resolve('p3'), 10))

Promise.all([p1, p2, p3])
  .then((results) => console.log('all:', results))
  .catch((e) => console.log('caught:', e))`,
    expected: `caught: p2 failed`,
    explanation:
      'p2 同步就 reject，Promise.all 立即整体 reject，then 不执行，错误直达 catch 输出 caught: p2 failed。p1、p3 仍会各自完成，但它们的结果被丢弃。',
  },

  // ── await 后续代码执行时机 ──────────────────────────────────────
  {
    id: 18,
    group: 'await 后续代码执行时机',
    title: 'await 已 settle 的 Promise 仍走微任务',
    code: `async function run() {
  console.log('A')
  await Promise.resolve()
  console.log('B')
}

Promise.resolve().then(() => console.log('C'))

run()
console.log('D')`,
    expected: `A
C
D
B`,
    explanation:
      'run() 里 A 同步输出；await 把 B 作为微任务入队。C 的 then 在 run() 之前就入队了，所以微任务队列是 [C, B]：先 C 后 B。await 即使等的是已敲定的 Promise，后续代码也不会同步执行，而是微任务恢复。',
  },
  {
    id: 19,
    group: 'await 后续代码执行时机',
    title: 'await 表达式求值时机',
    code: `async function f() {
  console.log('f start')
  const v = await Promise.resolve(10)
  console.log('f got:', v)
}

console.log('main start')
f()
console.log('main end')`,
    expected: `main start
f start
main end
f got: 10`,
    explanation:
      '调用 f() 时 f start 同步输出；遇到 await，f 暂停并返回，主流程继续输出 main end；当前同步代码结束后，微任务恢复 f，输出 f got: 10。await 只暂停当前 async 函数，不阻塞整个程序。',
  },
  {
    id: 20,
    group: 'await 后续代码执行时机',
    title: 'async 函数遇 await 暂停返回',
    code: `async function async1() {
  console.log('async1 start')
  await async2()
  console.log('async1 end')
}

async function async2() {
  console.log('async2 start')
}

async1()
console.log('after async1')`,
    expected: `async1 start
async2 start
after async1
async1 end`,
    explanation:
      'await async2() 先同步执行 async2（输出 async2 start），然后 async1 暂停并返回；主流程输出 after async1；同步结束后微任务恢复 async1，输出 async1 end。',
  },
]

export const promiseEventLoopTopic: Topic = {
  id: 'promise-event-loop',
  name: 'Promise + Event Loop',
  description:
    'setTimeout / Promise / async-await / Promise.all 等异步执行顺序题。选一道题 → 在编辑器里改/运行代码 → 右侧看输出，再点「显示答案」对照解析。',
  questions,
}