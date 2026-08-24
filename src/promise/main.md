# JavaScript Promise 学习笔记

> 一句话总结：Promise 是一个代表异步操作"最终完成或失败"结果的对象。它把"把回调传进函数"的旧模式，变成"把回调挂在返回的 Promise 上"，从而支持链式调用、统一错误处理和并发组合。
>
> 覆盖：状态与执行器、`then/catch/finally`、链式调用、错误传播、微任务时序、并发组合方法。`async/await` 的执行顺序细节会在异步专题笔记中展开，本篇只讲清它与 Promise 的关系。

---

## 一、先建立整体认识

### 1. Promise 解决什么问题

回调模式的两个核心痛点：

- **执行顺序反直觉**：必须在发起调用之前就准备好回调，"先调用，后写处理逻辑"做不到。
- **错误处理分散**：多步异步操作需要层层传递失败回调，形成"回调地狱"（callback hell）。

```js
// 回调模式：处理逻辑必须作为参数提前传入
getUser(id, function (user) {
  getOrders(user, function (orders) {
    getDetail(orders[0], function (detail) {
      console.log(detail)
    }, failureCallback)
  }, failureCallback)
}, failureCallback)

// Promise 模式：先拿到对象，再挂回调；错误只需在链尾处理一次
getUser(id)
  .then((user) => getOrders(user))
  .then((orders) => getDetail(orders[0]))
  .then((detail) => console.log(detail))
  .catch(failureCallback)
```

### 2. 一张状态流转图

```text
new Promise(executor)
  state: "pending"   result: undefined
        │
        ├── resolve(value) ──> state: "fulfilled"   result: value
        │
        └── reject(error)  ──> state: "rejected"    result: error

  规则：pending 只能变一次，方向只能是上面两条之一；
        一旦变成 fulfilled 或 rejected（合称 settled，已敲定），永远不可再变。
```

### 3. 最小示例

```js
const promise = new Promise((resolve, reject) => {
  // executor 会被 new Promise 自动、立即（同步）执行
  setTimeout(() => resolve('done'), 1000)
})

promise.then((result) => {
  console.log(result) // 1 秒后输出: done
})
```

---

## 二、基础概念

### 1. executor（执行器）

传给 `new Promise` 的函数叫 executor，即"生产结果的代码"。它的两个参数 `resolve` 和 `reject` 由 JavaScript 引擎提供，我们只需要在合适的时机调用其中一个：

| 调用 | 效果 | 推荐传参 |
| :--- | :--- | :--- |
| `resolve(value)` | 任务成功，状态变为 `fulfilled` | 任意值 |
| `reject(error)` | 任务失败，状态变为 `rejected` | `Error` 对象（或其子类） |

推荐用 `Error` 对象 reject，因为 `catch` 拿到后有 `.message`、`.stack` 可用，也和 `throw` 的行为保持一致。

### 2. 三种状态与 settled

| 状态 | 含义 | 能否改变 |
| :--- | :--- | :--- |
| `pending` | 初始状态，结果还没出来 | 可以变成 fulfilled 或 rejected |
| `fulfilled` | 成功完成，有 `result` | 终态，不可变 |
| `rejected` | 失败，有失败原因 | 终态，不可变 |

fulfilled 和 rejected 统称为 **settled（已敲定）**。

### 3. 状态只能敲定一次

```js
const promise = new Promise((resolve, reject) => {
  resolve(1)

  reject(new Error('...')) // 被忽略
  setTimeout(() => resolve(2)) // 同样被忽略
})

promise.then(console.log) // 1
```

第一次 `resolve`/`reject` 之后的调用全部静默忽略。另外它们只取第一个参数，多余参数也会被忽略。

### 4. executor 中 throw 等同于 reject

```js
const promise = new Promise((resolve, reject) => {
  throw new Error('Whoops!')
})

promise.catch(console.error) // Error: Whoops!
```

这保证了 Promise 内部的编程错误（如 `TypeError`）也能被链上的 `catch` 捕获，而不会静默丢失——这是回调模式做不到的。

### 5. state 和 result 是内部属性

`promise.state`、`promise.result` 无法直接访问（在控制台打印 Promise 对象可以看到，但代码里读不到）。读取结果只能通过 `.then` / `.catch` / `.finally`。

---

## 三、核心机制

### 1. then：注册成功和失败回调

```js
promise.then(
  (result) => { /* 处理成功结果 */ },
  (error) => { /* 处理失败 */ }
)
```

这是 `then` 的标准完整形式：第一个参数 `onFulfilled` 处理成功，第二个参数 `onRejected` 处理失败。两个回调是**平级**关系，**只会执行其中一个**（状态只能敲定一次）：

```js
const promise = new Promise((resolve, reject) => {
  setTimeout(() => reject(new Error('加载失败')), 1000)
})

promise.then(
  (result) => console.log('成功:', result), // 不执行
  (error) => console.log('失败:', error.message) // 1 秒后输出: 失败: 加载失败
)
```

注意第二个参数的捕获范围有盲区：它**只能捕获 Promise 本身 reject 的错误**，捕获不了第一个回调内部抛出的错误（那属于链的下一环）。而链尾的 `catch` 两种都能捕获。对比详见"五、易错点"第 2 条，结论是：

- 只关心成功：`promise.then(onFulfilled)`。
- 关心失败：用 `catch`，不要写 `then(null, f)`，更不要依赖 `then` 的第二个参数兜底。

### 2. catch：then(null, f) 的简写

```js
promise.catch((error) => {
  console.error(error)
})

// 完全等价于
promise.then(null, (error) => {
  console.error(error)
})
```

### 3. finally：不管成败都执行的清理

```js
new Promise((resolve, reject) => {
  /* 耗时操作 */
})
  .finally(() => stopLoading()) // 无论成败都先停掉 loading
  .then((result) => showResult(result))
  .catch((error) => showError(error))
```

`finally` 与 `then(f, f)` 相似，但有三点重要差异：

1. **回调没有参数**：在 `finally` 里不知道成功还是失败，它只做通用清理。
2. **结果透传**：上一步的结果或错误会原样传给下一个合适的处理器，`finally` 不改变它。
3. **返回值被忽略**：`finally` 里 `return` 的值不会成为下一个 `then` 的参数。（例外：`finally` 里 `throw` 的话，这个新错误会替换原有结果传给下一个错误处理器。）

### 4. 给已敲定的 Promise 挂回调，会立即执行

```js
const promise = new Promise((resolve) => resolve('done!'))

promise.then(console.log) // done!（不是不执行，而是作为微任务立即排队执行）
```

回调虽然"立即排队"，但依然是**异步**执行的（见第 7 节时序）。这是 Promise 相比真实"订阅列表"更强的地方：结果出来之后再订阅也能收到。

### 5. 链式调用：then 返回一个新 Promise

这是 Promise 最核心的机制。`then` 返回的不是原来的 Promise，而是一个**新的 Promise**：

```text
promiseA ──then(f1)──> promiseB ──then(f2)──> promiseC

promiseB 代表"f1 执行完成"这件事，而不是 promiseA 本身
```

下一个 `then` 拿到的值，由上一个回调的返回值决定，规则只有三条：

```js
Promise.resolve(1)
  // 规则 1：返回普通值 -> 新 Promise 用这个值 fulfill
  .then((v) => v + 1) // 2
  // 规则 2：返回一个 Promise -> 链会等它敲定，再取它的结果继续
  .then((v) => Promise.resolve(v * 10)) // 20
  // 规则 3：没有 return（返回 undefined）或抛错
  .then((v) => {
    console.log(v) // 20
    // 没有 return，下一个 then 拿到 undefined
  })
  .then((v) => {
    console.log(v) // undefined
  })
```

对应关系：

| 回调的行为 | 下一个 then 拿到的值 |
| :--- | :--- |
| `return 普通值` | 该值 |
| `return promise` | 该 promise 敲定后的结果（自动展开等待） |
| 不写 `return` | `undefined` |
| `throw` / 报错 | 跳过中间所有 `then`，进入最近的 `catch` |

### 6. 错误传播：链尾统一 catch

链上任何一环出错（`reject`、`throw`、回调抛异常），都会跳过中间所有的 `then`，直达最近的 `catch`：

```js
getUser(id)
  .then((user) => getOrders(user))   // 这里失败
  .then((orders) => getDetail(orders[0])) // 被跳过
  .then((detail) => render(detail))       // 被跳过
  .catch((error) => {
    // 上面任何一步的错误都会到这里
    console.error(error)
  })
```

`catch` 处理完错误后，链会**恢复正常**继续往后走：

```js
Promise.reject(new Error('failed'))
  .catch((e) => {
    console.log('捕获:', e.message) // 捕获: failed
    return 'recovered'
  })
  .then((v) => {
    console.log(v) // recovered
  })
```

### 7. 时序：then 的回调永远异步（微任务）

#### 为什么 then 的回调不立刻执行

Promise 的回调必须异步执行（否则 Promise 和同步代码就没区别），但又希望它"尽快"执行。因此 JS 引擎为它单独准备了一条**微任务队列**：`then` / `catch` / `finally` 的回调不会立刻运行，而是等当前同步代码全部跑完后、事件循环进入下一轮之前统一执行。

```js
Promise.resolve().then(() => console.log(2))
console.log(1)
// 输出顺序: 1, 2
```

如果 `then` 回调同步执行，结果会是 `2, 1`，破坏 Promise "结果总是在将来可用"的语义；如果它和 `setTimeout` 一样作为宏任务，又会等太久。

#### 什么是宏任务、什么是微任务

| 类型 | 代表 | 由谁产生 | 执行时机 |
| :--- | :--- | :--- | :--- |
| **微任务（microtask）** | `Promise.then/catch/finally`、`queueMicrotask` | JavaScript 引擎内部 | 当前同步代码结束后立即清空 |
| **宏任务（macrotask）** | `setTimeout/setInterval`、I/O、DOM 事件、`<script>` 整体 | 浏览器/Node 宿主环境 | 下一轮事件循环 |

可以把流程想象成餐厅后厨：

- **同步代码** = 厨师正在炒的菜
- **微任务** = 炒完菜后立刻补的小料（同轮做完）
- **宏任务** = 顾客新点的菜（下一轮再做）

`setTimeout(..., 0)` 就像告诉服务员："时间到了把订单塞给厨师。"订单进的是宏任务菜单，厨师必须把手头这道菜和这一轮要补的小料全部做完，才会去取它。

#### 为什么 setTimeout 是宏任务，Promise 是微任务

`setTimeout` 的回调由**宿主环境**调度（浏览器计时器到期后塞回队列），这种由宿主触发的任务就是宏任务。把它设计成宏任务还有一个重要原因：**微任务如果无限自我产生，会饿死宏任务**。例如：

```js
function loop() {
  Promise.resolve().then(loop) // 微任务里不断产生新微任务
}
loop()
// 这样 setTimeout 的回调将永远拿不到执行机会
```

所以宿主事件（定时、I/O、UI）必须作为宏任务单独排队，和引擎内部的微任务互相制衡。

#### "一轮事件循环"到底是什么

"一轮"不是固定时间（比如 16ms），而是这样一个完整节拍：

```text
1. 从宏任务队列取出一个任务执行
2. 这个宏任务执行过程中可能产生新的微任务
3. 该宏任务执行完后，立即清空整个微任务队列
4. 进入下一轮：再从宏任务队列取下一个任务
```

**一轮事件循环 = 执行一个宏任务 + 清掉它产生的所有微任务。**

每个 `setTimeout` 回调各自是一轮宏任务；整个 `<script>` 标签的同步代码也可以看作第一个宏任务。

#### 经典对比题（微任务 vs 宏任务）

```js
console.log('start')

setTimeout(() => console.log('timeout'), 0)

Promise.resolve().then(() => console.log('promise'))

console.log('end')

// 输出顺序:
// start
// end
// promise  <- 微任务，本轮同步代码结束后立即执行
// timeout  <- 宏任务，要等下一轮事件循环
```

带两个 `setTimeout` 的多轮例子：

```js
setTimeout(() => {
  console.log('A')
  Promise.resolve().then(() => console.log('B'))
}, 0)

setTimeout(() => {
  console.log('C')
}, 0)

Promise.resolve().then(() => console.log('D'))

// 输出顺序:
// D  （同步结束后先清微任务）
// A  （第 1 个宏任务）
// B  （该宏任务产生的微任务，同轮清空）
// C  （第 2 个宏任务）
// ----
// 初始：
//   宏任务队列: [timeout1, timeout2]
//   微任务队列: [D]

// 第 1 轮事件循环：
//   1. 先清微任务（同步代码结束后总是先清微任务）
//      -> 输出 D
//   2. 取第一个宏任务 timeout1 执行
//      -> 输出 A
//      这个宏任务里产生了微任务 B
//   3. timeout1 执行完，清微任务
//      -> 输出 B
//   第 1 轮结束

// 第 2 轮事件循环：
//   1. 取下一个宏任务 timeout2 执行
//      -> 输出 C
//   2. 没有微任务
//   第 2 轮结束
// ----
//  当前 <script> 宏任务（同步代码）：
//   1. 注册两个 setTimeout 回调到宏任务队列
//   2. 注册 then 回调 D 到微任务队列
//   3. 同步代码结束
//   4. 清微任务 -> 输出 D

// 第 1 轮事件循环：
//   5. 取宏任务 1 执行 -> 输出 A
//   6. 宏任务 1 里产生微任务 B
//   7. 宏任务 1 结束，清微任务 -> 输出 B

// 第 2 轮事件循环：
//   8. 取宏任务 2 执行 -> 输出 C
// ----
// 三个概念，同步代码、微任务、宏任务
// 优先级：同步代码 > 微任务 > 宏任务
// 可以将上述代码假设在 script 内，则 script 整体也就是一个宏任务。同步代码为空，微任务队列为空，开始执行 script 宏任务
// 宏任务中先执行同步代码，其中没有同步代码，注册两个 setTimeout 宏任务，注册一个 promise 微任务
// 清空微任务队列 -> 输出 D
// 第一轮结束
// 开始执行 setTimeout1 宏任务，setTimeout1 中有同步代码 console.log -> 输出 A
// 宏任务 1 结束，清微任务 -> 输出 B
// 第二轮结束
// 开始循环
```

记忆口诀：**同步代码 → 清空微任务队列 → 取一个宏任务 → 再清微任务队列 → 循环**。

### 8. 同一个 Promise 可以挂多个回调

```js
const promise = loadScript('/my.js')

promise.then((script) => console.log('第一个处理器'))
promise.then((script) => console.log('第二个处理器'))
```

回调按注册顺序依次执行；回调之间互不影响（一个报错不会阻止另一个运行）。回调模式的函数只能传一个回调，这是 Promise 的显著优势。

---

## 四、常见写法与推荐实践

### 1. 包裹旧的回调 API

只在最底层包一次，之后统一用 Promise 风格：

```js
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

wait(1000)
  .then(() => console.log('1 秒后执行'))
  .catch(failureCallback)
```

`setTimeout` 不会失败，所以这里不需要 `reject`。

### 2. 并发组合：四个静态方法

```js
// 三个请求同时发出（并发），全部成功后一起拿结果
Promise.all([func1(), func2(), func3()]).then(([r1, r2, r3]) => {
  // 结果顺序与传入顺序一致，与完成先后无关
})
```

| 方法 | 全部成功时 | 任一失败时 | 典型场景 |
| :--- | :--- | :--- | :--- |
| `Promise.all` | 返回按顺序的结果数组 | 立即整体 reject，其余结果丢弃 | 所有结果缺一不可 |
| `Promise.allSettled` | 返回每项的状态描述数组 | 永不 reject | 需要知道每一项各自的结果 |
| `Promise.any` | 返回第一个成功的结果 | 全部失败才 reject（`AggregateError`） | 多个备用源，取最快成功的 |
| `Promise.race` | 第一个敲定的结果（无论成败） | 同左 | 超时控制 |

`allSettled` 的返回结构：

```js
Promise.allSettled([Promise.resolve(1), Promise.reject(new Error('x'))])
  .then((results) => {
    console.log(results)
    // [
    //   { status: 'fulfilled', value: 1 },
    //   { status: 'rejected', reason: Error: x }
    // ]
  })
```

用 `race` 实现超时：

```js
Promise.race([
  fetch('/api/data'),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('超时')), 5000)
  ),
])
```

### 3. 串行 vs 并发

```js
// 串行：每一步依赖上一步结果，只能一步步来
const results = []
for (const task of tasks) {
  results.push(await task(results.at(-1)))
}

// 并发：任务之间无依赖，应同时发出（不要误写成串行！）
// 错误示范：for 循环里逐个 await，总耗时是各任务之和
// 正确做法：
const list = await Promise.all(tasks.map((task) => task()))
```

经验法则：**没有依赖关系就并发，有依赖关系才串行**。

### 4. 保持链扁平，避免嵌套

```js
// 不推荐：嵌套链，错误处理范围混乱
doSomething().then((url) => {
  fetch(url)
    .then((res) => res.json())
    .then((data) => console.log(data))
})

// 推荐：扁平链
doSomething()
  .then((url) => fetch(url))
  .then((res) => res.json())
  .then((data) => console.log(data))
```

嵌套的唯一合理用途：用内层 `catch` 精确地只捕获某一步的错误、吞掉可忽略的失败，然后继续主流程：

```js
doSomethingCritical()
  .then((result) =>
    doSomethingOptional(result)
      .then((optionalResult) => doSomethingExtraNice(optionalResult))
      .catch(() => {}) // 可选步骤失败就忽略，不影响主流程
  )
  .then(() => moreCriticalStuff())
  .catch((e) => console.error(`关键失败: ${e.message}`)) // 只捕获关键步骤的错误
```

### 5. async/await 是 Promise 的语法糖

`async` 函数返回 Promise，`await` 等价于 `then` 取值，`try/catch` 等价于 `catch`：

```js
// Promise 链
function main() {
  return doSomething()
    .then((result) => doSomethingElse(result))
    .then((newResult) => console.log(newResult))
    .catch((error) => failureCallback(error))
}

// async/await 写法
async function main() {
  try {
    const result = await doSomething()
    const newResult = await doSomethingElse(result)
    console.log(newResult)
  } catch (error) {
    failureCallback(error)
  }
}
```

两者可以混用，语义完全一致。`await` 只暂停当前 async 函数，不阻塞整个程序。

---

## 五、易错点与边界条件

### 1. 忘记 return，造成"浮动 Promise"（最高频错误）

```js
doSomething()
  .then((url) => {
    fetch(url) // 忘了 return！
  })
  .then((result) => {
    console.log(result) // undefined，且无法得知 fetch 的成败
  })

// 正确：
doSomething()
  .then((url) => {
    return fetch(url)
  })
  .then((result) => {
    // result 是 Response 对象
  })
```

规则：**回调里遇到 Promise 就 return 它**，把处理留给下一个 `then`。

### 2. then(f, g) 与 then(f).catch(g) 不等价

```js
// 写法 A：g 只捕获 promise 本身 reject 的错误
promise.then(f, g)

// 写法 B：g 既能捕获 promise 的错误，也能捕获 f 内部的错误
promise.then(f).catch(g)
```

| 错误来源 | `then(f, g)` 的 `g` | `catch(g)` |
| :--- | :--- | :--- |
| Promise 本身 `reject` | ✅ 能捕获 | ✅ 能捕获 |
| `f`（成功回调）内部抛错 | ❌ 捕获不到 | ✅ 能捕获 |
| 链上更前面环节的错误 | ❌ | ✅ 能捕获 |

原因：`then(f, g)` 的两个回调是**平级**的，`g` 只管"传进来的 Promise 失败了"这件事；而 `f` 自己抛的错属于 `then` 返回的**新 Promise**，会沿链向后传播。`catch` 的本质是 `then(null, g)`，挂在链的下一环，所以上游任何一环的错误流到这里都能被接住。

```js
Promise.resolve(1)
  .then(
    (v) => {
      throw new Error('处理时出错') // 第一个回调抛错
    },
    (e) => console.log('我不会执行') // ❌ 捕获不到上面的错！
  )

Promise.resolve(1)
  .then((v) => {
    throw new Error('处理时出错')
  })
  .catch((e) => console.log(e.message)) // ✅ 输出: 处理时出错
```

一句话记忆：**`then` 的第二个参数只守自己的门，`catch` 能接住上游整条链的错**。因此**优先使用 `then(f).catch(g)` 或链尾统一 `catch`**。

### 3. resolve 一个 Promise 会被自动展开

```js
const p1 = Promise.resolve(1)

const p2 = new Promise((resolve) => resolve(p1))

p2.then(console.log) // 1，不是 Promise 对象
```

想传递 Promise 对象本身而不被展开，需要包一层对象：`resolve({ promise: p1 })`。

### 4. Promise 构造函数反模式

```js
// 不推荐：把已有的 Promise 再包一层，多余且容易漏错
function loadUser(id) {
  return new Promise((resolve, reject) => {
    fetchUser(id)
      .then((user) => resolve(user))
      .catch(reject)
  })
}

// 推荐：直接返回并组合
function loadUser(id) {
  return fetchUser(id)
}
```

`new Promise` 只用于包裹回调式 API（如 `setTimeout`、事件监听）。

### 5. 不要用 async 函数做 executor

```js
// 危险：async executor 里的错误不会自动 reject 这个 Promise
const promise = new Promise(async (resolve) => {
  throw new Error('这个错误会变成 unhandled rejection')
})
```

executor 需要异步操作时，在内部正常使用 `then` 或先定义 async 函数再调用，让错误最终走到 `reject`。

### 6. 未处理的 rejection

链上没有 `catch` 的失败 Promise，会在浏览器触发 `unhandledrejection` 事件：

```js
// 浏览器：全局兜底，便于发现漏处理的错误
window.addEventListener('unhandledrejection', (event) => {
  console.log('未处理的拒绝:', event.reason)
})

// Node.js（注意大小写不同）:
process.on('unhandledRejection', (reason, promise) => {
  console.log('未处理的拒绝:', reason)
})
```

控制台出现 "Uncaught (in promise)" 报错，说明某条链漏了 `catch`。

### 7. 错误理解 / 正确理解速查

| 错误理解 | 正确理解 |
| :--- | :--- |
| `then` 返回原来的 Promise | 返回一个**新的** Promise，链式调用才得以成立 |
| Promise 可以被 resolve 两次 | 状态只能敲定一次，后续调用全部忽略 |
| `finally` 的返回值会传给下一个 `then` | 会被忽略，原结果原样透传 |
| `Promise.all` 里某个任务失败，其他任务会被取消 | 其他任务继续运行，只是结果不再通过 `all` 暴露 |
| `await` 会阻塞整个程序 | 只暂停当前 async 函数，事件循环照常运转 |
| 已敲定的 Promise 上挂 `then` 会同步执行 | 依然作为微任务异步执行 |

---

## 六、调试与练习

### 调试方法

```js
// 1. 控制台直接查看 Promise 状态（Chrome 会显示 Promise {<fulfilled>: 42}）
const p = Promise.resolve(42)
console.log(p) // Promise { 42 }

// 2. 打印同步时刻的状态：一定是 pending（then 的回调还没机会跑）
const p2 = new Promise((resolve) => setTimeout(() => resolve('done'), 1000))
console.log(p2) // Promise { <pending> }
setTimeout(() => console.log(p2), 1500) // Promise { 'done' }

// 3. 监听全局未处理拒绝，定位漏掉的 catch
window.addEventListener('unhandledrejection', (e) => {
  console.warn('未处理:', e.reason)
})
```

### 练习 1：输出顺序（微任务 vs 宏任务）

```js
console.log('A')

setTimeout(() => console.log('B'), 0)

Promise.resolve()
  .then(() => console.log('C'))
  .then(() => console.log('D'))

console.log('E')
```

<details>
<summary>查看答案</summary>

输出顺序：`A E C D B`。

同步代码先跑完（A、E）；然后清空微任务队列（C、D，第二个 then 依赖第一个，依次执行）；最后执行宏任务（B）。
</details>

### 练习 2：实现 delay（javascript.info 经典题）

实现 `delay(ms)`，返回一个 `ms` 毫秒后才 fulfill 的 Promise：

```js
function delay(ms) {
  // 你的代码
}

delay(3000).then(() => console.log('3 秒后运行'))
```

<details>
<summary>查看答案</summary>

```js
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
```

`setTimeout` 不会失败，所以不需要 `reject`。
</details>

### 练习 3：Promise 会被重复 resolve 吗？（javascript.info 经典题）

```js
const promise = new Promise((resolve, reject) => {
  resolve(1)

  setTimeout(() => resolve(2), 1000)
})

promise.then(console.log)
```

<details>
<summary>查看答案</summary>

输出 `1`。状态只能敲定一次，1 秒后的第二次 `resolve` 被忽略。
</details>

### 练习 4：链上的值怎么传？

```js
Promise.resolve(2)
  .then((v) => v * 3)
  .then((v) => Promise.resolve(v + 1))
  .then((v) => {
    console.log(v)
  })
```

<details>
<summary>查看答案</summary>

输出 `7`。`2 * 3 = 6`（普通值传递）；返回 `Promise.resolve(7)` 被展开等待，下一个 `then` 拿到 `7`。
</details>

### 练习 5：catch 之后链怎么走？

```js
Promise.reject(new Error('失败'))
  .then(() => console.log('跳过我'))
  .catch((e) => {
    console.log('捕获:', e.message)
  })
  .then(() => console.log('我会执行吗？'))
```

<details>
<summary>查看答案</summary>

输出：`捕获: 失败`，然后 `我会执行吗？`。

`catch` 把链恢复正常，后面的 `then` 照常执行（拿到 `undefined`，因为 `catch` 没有 return）。
</details>

---

## 七、总结

### 记忆口诀

> **一诺千金**：状态只能敲定一次，不可反悔。
> **一链到底**：`then` 返回新 Promise，值沿链传递，错直达 `catch`。
> **遇 Promise 就 return**：防止浮动 Promise。
> **微任务先行**：`then` 回调永远异步，排在 `setTimeout` 之前。

### 核心要点清单

- [ ] Promise 是"结果占位符"：把回调传入函数变成把回调挂在返回对象上。
- [ ] 三种状态 `pending / fulfilled / rejected`，终态不可逆，只能敲定一次。
- [ ] executor 同步立即执行；内部 `throw` 等同于 `reject`。
- [ ] `catch` 是 `then(null, f)` 的简写；`finally` 无参数、透传结果、忽略返回值。
- [ ] 链式调用的三条返回值规则：普通值、Promise（展开等待）、无 return（undefined）。
- [ ] 错误跳过中间 `then` 直达最近 `catch`；`catch` 后链恢复正常。
- [ ] `then` 回调是微任务：同步代码 → 微任务 → 宏任务。
- [ ] 四个组合方法：`all`（全要）、`allSettled`（全看）、`any`（一个就行）、`race`（谁快听谁）。
- [ ] 优先扁平链 + 链尾统一 `catch`；嵌套仅用于局部错误隔离。
- [ ] `async/await` 是 Promise 的语法糖，语义完全一致。

---

## 参考资料

- [Promise 基础 — javascript.info](https://javascript.info/promise-basics)
- [使用 Promise — MDN 指南](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [Promise — MDN 参考](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
