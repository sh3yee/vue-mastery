# JavaScript 事件循环：任务、微任务与渲染

> 一句话总结：JavaScript 在同一执行线程上一次只运行一段代码；事件循环会在每个任务结束后**清空微任务队列**，浏览器随后才有机会渲染页面并执行下一个任务。理解它可以准确判断 `Promise`、`queueMicrotask()`、`setTimeout()` 与 DOM 更新的先后顺序。
>
> 覆盖：浏览器环境的任务（常被称为“宏任务”）、微任务、调用栈、渲染时机、`queueMicrotask()` 和 `setTimeout()`。Node.js 的事件循环阶段与 `process.nextTick()` 不在本文范围内。

---

## 一、先建立整体认识

### 1. 事件循环解决什么问题

浏览器需要同时响应点击、计时器、网络结果和页面绘制；但一段 JavaScript 同步代码执行期间不能被另一段 JavaScript 插入执行。

事件循环（event loop）负责在“当前代码运行完”后，按规则挑选下一段待执行代码。它不是让 JavaScript 同时执行多个回调，而是让回调**轮流执行**。

```text
调用栈（当前正在执行）
          │
          ▼ 当前任务结束，调用栈清空
微任务队列：Promise 回调、queueMicrotask 回调
          │
          ▼ 必须清空（执行中新增的微任务也要继续执行）
浏览器可能更新渲染
          │
          ▼
任务队列：脚本、定时器回调、用户事件等
          │
          └── 取一个可运行任务，回到开头
```

> **术语提示**：规范和 MDN 通常称为 **task（任务）**；前端教程常把它叫作“宏任务（macrotask）”，本篇将“任务（宏任务）”视作同一个便于学习的概念。真实浏览器有不同来源的任务队列和选择规则，不能把它理解成所有异步回调都严格共用一个 FIFO 队列。

### 2. 最小示例：为什么 Promise 先于 setTimeout

```js
console.log('1: 同步开始')

setTimeout(() => {
  console.log('4: 定时器任务')
}, 0)

Promise.resolve().then(() => {
  console.log('3: Promise 微任务')
})

console.log('2: 同步结束')

// 预期输出：
// 1: 同步开始
// 2: 同步结束
// 3: Promise 微任务
// 4: 定时器任务
```

执行过程：

1. 当前脚本作为一个任务运行，两个 `console.log` 立即执行。
2. `setTimeout` 只登记计时器；到期后回调才能成为一个待执行任务。
3. `.then()` 回调进入微任务队列。
4. 当前脚本结束后，事件循环清空微任务，输出 `3`。
5. 然后才有机会执行已就绪的定时器任务，输出 `4`。

---

## 二、基础概念

### 1. 调用栈：同步代码的执行位置

调用栈（call stack）保存当前正在执行的函数。栈未清空时，浏览器不会开始执行新的任务或微任务。

```js
function inner() {
  console.log('inner')
}

function outer() {
  inner()
  console.log('outer')
}

outer()
console.log('script')

// 预期输出：
// inner
// outer
// script
```

容易混淆的一点是：`function inner() { ... }` 和 `function outer() { ... }` 是**函数声明**。它们会创建函数并绑定名称，但不会执行函数体，因此不会让 `inner` 或 `outer` 因为“写在前面”而入栈。只有遇到带括号的实际调用，例如 `outer()`，才会进入调用栈。

上例的执行过程如下：

```text
1. 顶层脚本依次读取两个函数声明：创建 inner 和 outer，不调用它们。

2. 遇到 outer()：调用栈为
  [outer]

3. outer 的函数体运行到 inner()：调用栈为
  [outer, inner]
  inner 位于栈顶，因此先执行。

4. inner 内部执行 console.log('inner')，输出 inner；
  inner 执行完毕并出栈，调用栈回到 [outer]。

5. outer 继续执行 console.log('outer')，输出 outer；
  outer 执行完毕并出栈，调用栈变为空。

6. 顶层脚本继续执行下一行 console.log('script')，输出 script。
```

`console.log()` 也是一次函数调用，运行时会有短暂的调用记录；上图为了突出 `outer` 与 `inner` 的关系而省略了它。可以记成：**声明不调用，调用才入栈；后调用的函数在栈顶，必须先返回。**

### 2. 任务（task / 常称宏任务）

任务是宿主环境安排的一次较完整工作。常见来源：

| 来源 | 何时成为待执行任务 |
| :--- | :--- |
| 顶层 `<script>` | 浏览器开始执行脚本时 |
| 用户点击、输入等事件 | 事件分发时 |
| `setTimeout` / `setInterval` 回调 | 延迟时间到达且浏览器可调度时 |
| 网络、消息等宿主回调 | 对应事件就绪时 |

事件循环一次通常只取一个任务运行；任务结束后不会直接取下一个，而是先处理微任务。

### 3. 微任务（microtask）

微任务用于“当前工作结束后尽快执行，但仍保持异步”的短小操作。常见来源：

| 来源 | 说明 |
| :--- | :--- |
| `Promise.then()` / `.catch()` / `.finally()` | Promise 反应回调 |
| `queueMicrotask(callback)` | 显式加入一个微任务 |
| `MutationObserver` | DOM 变更观察回调 |
| `await` 的后续执行 | 基于 Promise 的微任务机制 |

#### 同步、异步与并行：先区分三个概念

微任务是**异步**的，不是因为它和其他代码“同时执行”，而是因为它不会在登记它的这一行立刻运行，而会等当前调用栈清空后再运行。

```js
console.log('A')

queueMicrotask(() => {
  console.log('B: 微任务')
})

console.log('C')

// 预期输出：A、C、B: 微任务
```

若 `queueMicrotask()` 是同步的，输出应为 `A、B、C`；实际先输出 `C`，说明回调被延后执行，因此它是异步的。

| 概念 | 关注的问题 | 示例 |
| :--- | :--- | :--- |
| **同步** | 是否在当前调用栈中立刻执行并完成 | `console.log('A')` 立即输出 |
| **异步** | 是否先登记、等当前代码结束后再执行 | `queueMicrotask(callback)`、`.then(callback)` |
| **并行** | 是否在同一时刻由多个线程推进计算 | Web Worker 可与主线程并行计算 |

JavaScript 主线程仍会一次只执行一个回调。因此多个微任务虽然都是异步登记的，真正执行时仍按入队顺序逐个运行，并**不并行**：

```js
queueMicrotask(() => console.log(1))
queueMicrotask(() => console.log(2))

// 当前同步代码结束后依次输出：1、2
```

微任务的关键规则：**每个任务结束后，微任务队列会被一直执行到为空。** 微任务执行时继续加入的微任务，也会在下一个任务前执行。

### 4. 渲染不是同步发生的

JavaScript 修改 DOM 后，浏览器通常不会在当前任务中立刻绘制像素；它会在任务结束、微任务清空后**有机会**更新渲染。

因此下列代码中，页面通常只会呈现最终的 `完成`，用户看不到中间的“处理中”：

```js
status.textContent = '处理中…'

for (let i = 0; i < 1e9; i++) {
  // 耗时同步计算
}

status.textContent = '完成'
```

原因是 **DOM 数据更新** 与 **将像素绘制到屏幕** 是两件事：第一行确实立刻把 DOM 中的文本改为“处理中…”，但当前同步任务还没有结束，浏览器通常不会中途插入渲染。长循环结束前，第三次赋值又将 DOM 改成了“完成”。等调用栈清空后，浏览器终于有机会绘制时，它看到的已经是最终状态。

```text
1. textContent 改为“处理中…”：DOM 已更新，但尚未绘制
2. 长循环持续占用主线程：当前任务未结束，不能处理渲染
3. textContent 改为“完成”：DOM 的“处理中…”状态被覆盖
4. 当前任务结束，微任务清空
5. 浏览器有机会渲染：只会绘制最终的“完成”
```

这不是“处理中…”没有赋值成功，而是它在获得绘制机会之前已经被后一次赋值覆盖。若要让浏览器**有机会**先显示“处理中…”，可以将后续工作安排到一个未来任务：

```js
status.textContent = '处理中…'

setTimeout(() => {
  for (let i = 0; i < 1e9; i++) {
    // 耗时同步计算
  }

  status.textContent = '完成'
}, 0)
```

此时当前任务会在登记定时器后结束；浏览器可在运行定时器回调前绘制“处理中…”。但长循环仍会在下一任务中阻塞交互。实际开发应把工作拆为多个小块，或使用 Web Worker 执行重 CPU 计算。

“有机会”不等于每轮必定渲染。渲染节奏还受屏幕刷新、浏览器策略和页面状态影响；不要把事件循环的一轮机械等同于固定的 $16.7\text{ms}$。

---

## 三、核心机制：如何推导执行顺序

### 1. 简化执行流程

浏览器事件循环的学习模型如下：

```text
1. 取一个可运行任务并执行（例如整个 script 或一个 click 回调）
2. 调用栈清空后，按入队顺序执行所有微任务
   - 微任务中新加入的微任务也继续执行
3. 浏览器可能进行渲染更新
4. 回到第 1 步
```

注意：初始脚本本身就是一项任务。因此顶层同步代码结束后，也会立即进行一次微任务检查点。

### 2. 微任务可以继续产生微任务

```js
console.log('A')

queueMicrotask(() => {
  console.log('B')

  queueMicrotask(() => {
    console.log('C')
  })
})

setTimeout(() => {
  console.log('D')
}, 0)

console.log('E')

// 预期输出：A、E、B、C、D
```

队列变化：

```text
当前脚本运行时：
  微任务队列 [B]
  任务队列   [D]

脚本结束：执行 B，B 又加入 C
  微任务队列 [C]

继续执行 C，微任务队列清空后才执行 D
```

所以不能只记“微任务优先一次”；准确说法是：**在开始下一个任务前，必须清空全部微任务。**

### 3. 综合题：按入队时机推导

```js
console.log(1)

setTimeout(() => console.log(2), 0)

Promise.resolve().then(() => console.log(3))

Promise.resolve().then(() => {
  setTimeout(() => console.log(4), 0)
})

Promise.resolve().then(() => console.log(5))

setTimeout(() => console.log(6), 0)

console.log(7)

// 预期输出：1、7、3、5、2、6、4
```

推导：

1. 同步部分输出 `1`、`7`；此时微任务为 `[3, 登记 4, 5]`，已就绪的定时器任务为 `[2, 6]`。
2. 清空微任务：输出 `3`；第二个微任务登记了定时器 `4`；输出 `5`。
3. 依次运行任务：输出 `2`、`6`、`4`。`4` 最晚登记，因此排在两个已登记的定时器之后。

> 不同任务来源之间的具体先后在规范层面可能受浏览器调度影响。上例只比较同一上下文中、相同延迟的 `setTimeout` 登记顺序，适合作为学习模型。

---

## 四、`queueMicrotask()`：显式安排微任务

### 1. 基本用法

```js
console.log('同步开始')

queueMicrotask(() => {
  console.log('微任务回调')
})

console.log('同步结束')

// 预期输出：
// 同步开始
// 同步结束
// 微任务回调
```

`queueMicrotask(callback)` 接收一个无参数回调，返回 `undefined`。它可在浏览器的 `Window` 和 Web Worker 环境中使用，也已被现代 Node.js 支持。

### 2. 它与 `Promise.resolve().then()` 的区别

二者都能排入微任务队列，但意图和错误表现不同：

| 写法 | 推荐用途 | 回调抛出异常时 |
| :--- | :--- | :--- |
| `queueMicrotask(callback)` | 明确只想延后到微任务执行 | 按普通未捕获异常报告 |
| `Promise.resolve().then(callback)` | 需要 Promise 链、值传递或错误链 | 变成 rejected Promise，可由链上的 `catch` 处理 |

不要为了创建微任务而滥用 `Promise.resolve().then()`；需要显式调度时优先使用 `queueMicrotask()`，需要 Promise 语义时再用 Promise。

### 3. 实际用途：统一同步与异步分支的时序

假设 `getData()` 优先从缓存取数据：缓存命中时可以立即取得，未命中时则要通过 `fetch()` 异步请求。若缓存命中后直接调用 `onLoad()`，同一个 API 就会出现两种不同的回调时序：

```js
function getData(cache, key, onLoad) {
  if (cache.has(key)) {
    onLoad(cache.get(key)) // 缓存命中：同步调用
    return
  }

  fetch(`/api/${key}`)
    .then((response) => response.json())
    .then(onLoad) // 缓存未命中：请求完成后异步调用
}
```

结合调用方来看，问题会更直观。先创建一个缓存，并提前放入 `user` 数据：

```js
const cache = new Map()
cache.set('user', { name: '张三' })

console.log('调用前')

getData(cache, 'user', (data) => {
  console.log('收到数据', data)
})

console.log('调用后')
```

此时 `cache.has('user')` 为 `true`，属于**缓存命中**，原实现会同步调用 `onLoad()`：

```text
调用前 → 收到数据 → 调用后
```

如果改为空缓存，则属于**缓存未命中**：

```js
const cache = new Map()

console.log('调用前')

getData(cache, 'user', (data) => {
  console.log('收到数据', data)
})

console.log('调用后')
```

`cache.has('user')` 此时为 `false`，`getData()` 会执行 `fetch()`；`onLoad()` 只能在网络请求完成后异步执行：

```text
调用前 → 调用后 → 收到数据
```

也就是说，`onLoad()` 有时会在 `getData()` 返回前执行，有时会在返回后执行。调用方的状态可能因此产生不同结果：

```js
const cache = new Map([['user', { name: '张三' }]])
let ready = false

getData(cache, 'user', () => {
  console.log(ready)
})

ready = true

// 原实现中：缓存命中输出 false，未命中输出 true
```

调用方不应该仅因缓存中是否有数据，就得到不同的程序行为。可以使用 `queueMicrotask()` 将缓存分支的回调也改为异步执行：

```js
function getData(cache, key, onLoad) {
  if (cache.has(key)) {
    queueMicrotask(() => {
      onLoad(cache.get(key))
    })
    return
  }

  fetch(`/api/${key}`)
    .then((response) => response.json())
    .then(onLoad)
}
```

  修改后，两条路径都遵守同一个约定：**`onLoad()` 一定在 `getData()` 返回之后执行。** 因此上面的 `ready` 无论是否命中缓存都会输出 `true`。

  这里统一的是“回调不会同步执行”这一 API 契约，而不是具体完成时间：

  - 缓存命中：当前同步代码结束后，在微任务中调用 `onLoad()`；
  - 缓存未命中：网络请求完成后，再通过 Promise 微任务调用 `onLoad()`。

  未命中缓存显然可能等待更久。`queueMicrotask()` 的目的不是让请求更快，也不是让两条路径同时完成，而是消除“有时同步、有时异步”的不确定性，为调用方提供稳定、可预测的执行时序。这类处理常见于库和框架的 API 设计中。

### 4. 实际用途：批量合并同一轮操作

```js
const pendingIds = new Set()
let scheduled = false

function scheduleSave(id) {
  pendingIds.add(id)

  if (scheduled) return
  scheduled = true

  queueMicrotask(() => {
    console.log([...pendingIds]) // 同步连续调用时只处理一次
    pendingIds.clear()
    scheduled = false
  })
}

scheduleSave('a')
scheduleSave('b')
scheduleSave('a')
// 预期输出：['a', 'b']
```

当前任务内连续调用 `scheduleSave()` 时，只会登记一个微任务，避免重复处理。

---

## 五、`setTimeout()`：安排未来的任务

### 1. `0` 不表示立即执行

```js
setTimeout(() => {
  console.log('timeout')
}, 0)

console.log('after scheduling')

// 预期输出：
// after scheduling
// timeout
```

`setTimeout` 的延迟是“回调**最早**可以被调度的等待时间”，不是精确执行时间。即使 `delay` 为 `0`：

- 当前任务必须先结束；
- 当前任务之后的全部微任务必须先完成；
- 浏览器还可能因繁忙、后台标签页节流等原因延后执行。

因此不能用 `setTimeout(..., 0)` 做精确计时，也不能把它当作“立刻执行”。

### 2. 推荐传函数，不传字符串

```js
// 推荐
setTimeout(() => {
  console.log('安全且可分析')
}, 1000)

// 不推荐：等价于动态执行字符串，存在注入风险
setTimeout("console.log('不要这样写')", 1000)
```

传入字符串具有与 `eval` 相似的安全和可维护性问题，应避免使用。

### 3. 大计算任务要让出事件循环

将工作拆为小块，并用 `setTimeout` 安排下一块，浏览器才有机会响应事件和更新进度：

```js
let completed = 0
const total = 1_000_000
const step = 10_000

function processChunk() {
  const end = Math.min(completed + step, total)

  while (completed < end) {
    completed += 1
  }

  console.log(`进度：${completed}/${total}`)

  if (completed < total) {
    setTimeout(processChunk, 0)
  }
}

processChunk()
```

这里不能用递归 `queueMicrotask(processChunk)` 替代 `setTimeout`：微任务会连续清空，浏览器无法在中间渲染或处理点击，效果接近阻塞。

对于真正耗时的 CPU 计算，优先考虑 Web Worker，让计算移到另一个线程；它不能访问 DOM，但可通过消息与主线程通信。

---

## 六、易错点与边界条件

### 1. 错误理解：微任务在函数返回时执行

**正确理解**：微任务要等当前调用栈清空，即当前任务整体结束后才执行，不是某个普通函数刚返回就执行。

```js
function work() {
  queueMicrotask(() => console.log('微任务'))
  console.log('函数内部结束')
}

work()
console.log('脚本仍在继续')

// 预期输出：
// 函数内部结束
// 脚本仍在继续
// 微任务
```

### 2. 错误理解：`await` 后面的代码还是同步代码

**正确理解**：`await` 之前的代码会在调用 `async` 函数时同步执行；遇到 `await` 后，当前函数暂停并暂时返回。即使等待的是已完成的 Promise，JavaScript 也会安排一个微任务，在当前同步代码结束后恢复该函数。

```js
async function run() {
  console.log('async start') // 调用 run() 时同步执行
  await Promise.resolve()
  console.log('after await') // run() 在微任务中恢复后执行
}

run()
console.log('script end')

// 预期输出：
// async start
// script end
// after await
```

这里并不是把 `console.log('after await')` 这一行单独放进微任务队列，而是把“**从 `await` 后面继续执行 `run()`**”这一恢复操作安排为微任务：

```text
1. 调用 run()，同步输出 async start
2. 遇到 await，run() 暂停，登记“继续执行 run()”的微任务
3. 顶层脚本继续执行，输出 script end
4. 当前同步代码结束，执行微任务，run() 从 await 后恢复
5. 输出 after await
```

如果 `await` 后面有多行代码，它们也不是每行各占一个微任务；函数恢复后，这些代码仍会像普通同步代码一样依次执行，直到函数结束或再次遇到 `await`。因此，准确说法是：**`await` 后续代码由微任务异步恢复执行，恢复后的代码段内部仍按同步顺序运行。**

### 3. 错误理解：微任务越多越好、越快越好

**正确理解**：微任务会被连续清空。若不断加入新微任务，定时器、输入、网络事件和渲染可能长期得不到机会。

```js
function loop() {
  queueMicrotask(loop)
}

// loop() // 不要运行：会持续占用微任务检查点，页面可能失去响应
```

微任务应保持短小、有界；需要让出主线程时，使用任务调度、`requestAnimationFrame` 或 Web Worker 等更合适的方案。

### 4. 错误理解：页面一定在每个任务之后绘制一次

**正确理解**：任务和微任务完成后，浏览器**可以**进行渲染；但是否绘制以及何时绘制由浏览器决定。动画或与下一帧绘制协作时，使用 `requestAnimationFrame()`，不要依赖多个 `setTimeout(0)` 的偶然时序。

---

## 七、调试与练习

### 1. 用性能面板观察长任务

在 Chrome/Edge DevTools 的 **Performance** 面板录制操作：

1. 触发一次点击或执行示例；
2. 查找 Main 线程上持续时间很长的任务；
3. 展开任务，观察其中的函数调用和微任务；
4. 若长任务阻塞交互，将工作拆块或迁移到 Web Worker。

控制台中可直接使用“打点”观察顺序：

```js
const log = (label) => console.log(label, performance.now().toFixed(1))

log('同步 1')
queueMicrotask(() => log('微任务'))
setTimeout(() => log('任务'), 0)
log('同步 2')
```

时间数值只用于辅助观察；顺序才是这个示例要验证的重点。

### 2. 练习

#### 练习 1：判断输出

```js
setTimeout(() => console.log('A'), 0)
queueMicrotask(() => console.log('B'))
Promise.resolve().then(() => console.log('C'))
console.log('D')
```

<details>
<summary>答案</summary>

输出为 `D、B、C、A`。同步代码 `D` 最先执行；`B`、`C` 按登记顺序进入微任务队列；最后运行定时器任务 `A`。

</details>

#### 练习 2：补全稳定时序

将下面缓存命中分支补全，确保 `onReady` 在两条路径中都异步执行：

```js
function loadUser(cache, id, onReady) {
  if (cache.has(id)) {
    // 在此补全
    return
  }

  fetch(`/api/users/${id}`)
    .then((response) => response.json())
    .then(onReady)
}
```

<details>
<summary>答案</summary>

```js
queueMicrotask(() => {
  onReady(cache.get(id))
})
```

</details>

---

## 八、总结

| 目标 | 推荐方式 | 原因 |
| :--- | :--- | :--- |
| 当前同步代码结束后尽快执行，且先于下一任务 | `queueMicrotask()` | 显式安排微任务 |
| 处理 Promise 成功、失败或链式结果 | `.then()` / `.catch()` / `await` | 使用 Promise 的微任务机制 |
| 让浏览器有机会处理事件、渲染，再继续工作 | `setTimeout(callback, 0)` | 安排未来任务 |
| 在下一帧绘制前执行视觉更新 | `requestAnimationFrame()` | 与浏览器绘制节奏协作 |
| 执行重 CPU 计算且不阻塞页面 | Web Worker | 使用独立线程 |

记忆口诀：**同步代码先跑完；每个任务后清空微任务；浏览器才有机会绘制；然后再取下一个任务。**

## 参考资料

- [Event loop: microtasks and macrotasks - JavaScript.info](https://javascript.info/event-loop)
- [Using microtasks in JavaScript with queueMicrotask() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)
- [Window: queueMicrotask() method - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/queueMicrotask)
- [Window: setTimeout() method - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)
