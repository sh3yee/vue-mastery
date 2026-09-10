# 防抖与节流：debounce 与 throttle

> 一句话总结：防抖（debounce）把一连串高频调用合并成"停止触发后"的一次执行，节流（throttle）把执行频率限制为"固定时间内最多一次"；两者都是基于闭包保存定时器或冷却状态、用包装函数拦截原始调用的普通函数，不是浏览器内置 API。
>
> 覆盖：JavaScript.info 的防抖、节流任务及手写实现；lodash 的 `_.debounce()` 与 `_.throttle()`，包括 `leading` / `trailing` / `maxWait` 选项和 `cancel` / `flush` 方法。不涉及框架层 hooks 封装与 Web Worker 等替代方案。

---

## 一、先建立整体认识

### 1. 它们解决什么问题

浏览器里有些事件触发得非常频繁：

| 事件 | 典型触发频率 |
| :--- | :--- |
| `input` 输入 | 每敲一个字符触发一次 |
| `mousemove` | 约 100 次/秒（每 10ms 一次） |
| `scroll` / `resize` | 拖动期间连续触发 |

如果回调很重——发网络请求、操作 DOM、复杂计算——按原始频率执行会浪费大量资源。防抖和节流是两种控制执行次数的手段，学习目标是：**能解释两者的区别、能手写简化版、能正确选用 lodash 的选项**。

### 2. 一句话区分

- **防抖**：不断重置定时器，**停止触发后**再执行一次。关注"最终状态"。
- **节流**：固定时间内最多执行一次。关注"持续反馈"。

### 3. 行为对比图

```text
时间 →     0ms   100ms 200ms 300ms 400ms …… 1500ms
事件流:     ●     ●     ●     ●     ●         ●   （持续触发中）

原始调用:   执行   执行   执行   执行   执行       执行

防抖 500ms: （定时器被不断重置，持续触发期间一次都不执行，
              直到停止触发 500ms 后，用最后一次参数执行一次）

节流 500ms: 执行   保存   保存   保存   补一次     按节奏执行
            ↑立即执行，之后每个 500ms 窗口内最多执行一次
```

此图是概念示意。精确的时间线推演见第三节；两个包装器都保留"最后一次调用的参数"，最终状态不会丢失。

---

## 二、基础概念

### 1. 防抖（debounce）

`debounce(func, ms)` 返回一个包装器，它把对 `func` 的调用推迟到"**最后一次调用**之后经过 `ms` 毫秒且期间没有新调用"，并用最后一次调用的参数执行 `func` 一次。

术语来源是电子工程的"去抖动"：机械按键按下时触点会抖动几十毫秒，电路不能把每次抖动都当成一次按键，要等信号稳定后再确认一次。前端借用了这个词——等事件流"安静"下来再处理一次。

JavaScript.info 用秘书打比方：`debounce` 像一位"接听电话的秘书"，她一直等到 `ms` 毫秒的安静时间之后，才把最新的来电信息传达给"老板"（真正要调用的 `func`）。

类比局限：秘书转达的是最新一条，防抖执行的也只有最后一次调用的参数；**中间的调用不是排队等待，而是被直接丢弃**。不要把类比延伸成"积压的电话都会转达"。

### 2. 节流（throttle）

`throttle(func, ms)` 返回一个包装器，它保证 `func` 的执行频率**不超过每 `ms` 毫秒一次**。

同样用秘书类比：她还是会接每通电话（不丢联系），但约定"最多每 `ms` 毫秒打扰老板一次"。冷却期内她只记下最新一通电话的内容；冷却一到，就带着最新信息去见一次老板。

类比局限：冷却结束后"要不要补执行最后一次调用"取决于实现。JavaScript.info 的实现和 lodash 的默认行为都会补（即 trailing），也有简化实现不补——选型时要看文档确认。

### 3. 包装器 = 闭包 + 定时器

两者的实现结构完全相同：

```text
debounce / throttle(func, ms)
  └── 返回 wrapper（普通 function，保留自己的 this 和参数）
        └── 闭包变量：定时器 id / 冷却标记 / 保存的参数
              └── 通过 func.apply(this, args) 转发给原始函数
```

用到三个前置知识（对应已有笔记：闭包、this 绑定、call/apply/bind）：

| 前置知识 | 在这里的作用 |
| :--- | :--- |
| 闭包 | `timeout`、`isThrottled` 等变量定义在包装器外层，包装器的**多次调用**读写的是同一份变量；没有闭包，状态无法跨调用存活 |
| this 绑定 | 包装器必须声明成普通 `function`，才能在 `obj.method()` 这样的调用中拿到 `obj` 作为 `this`；箭头函数没有自己的 `this`，不能当包装器 |
| call / apply | `func.apply(this, args)` 把"调用方给的 this 和参数"原样转发给原始函数 |

---

## 三、核心机制：手写实现

### 1. 手写防抖

```js
function debounce(func, ms) {
  let timeout

  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), ms)
  }
}
```

逐行拆解：

1. `let timeout`：闭包变量，保存当前唯一未到期的定时器 id。
2. `clearTimeout(timeout)`：每次调用先取消上一次安排的执行——这就是"不断重置定时器"。
3. `timeout = setTimeout(...)`：重新安排 `ms` 后的执行。
4. 箭头函数捕获 wrapper 的 `this`，`func.apply(this, args)` 连同 this、参数一起转发。
5. 早期写法用 `arguments` 对象收集参数：`return function () { ... func.apply(this, arguments) }`，与 rest 参数 `...args` 等价；现代代码推荐 rest 参数。

时间线推演（`ms = 1000`，对应 JavaScript.info 的例子：分别在 0ms、200ms、500ms 调用）：

```text
0ms    调用 f('a') → 无旧定时器，安排 1000ms 后执行
200ms  调用 f('b') → 清除 0ms 安排的定时器，重新安排 1000ms 后执行
500ms  调用 f('c') → 清除 200ms 安排的定时器，重新安排 1000ms 后执行
       （此后再无调用）
1500ms 定时器到期 → 以参数 'c' 执行一次 func
```

结论：**执行时刻只由最后一次调用决定，执行参数也只保留最后一次调用的。**`f('a')` 和 `f('b')` 不会执行。

控制台复现（可整段粘贴运行）：

```js
function debounce(func, ms) {
  let timeout

  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), ms)
  }
}

const now = () => Math.round(performance.now())

const search = debounce((query) => {
  console.log(`搜索：${query} @ ${now()}ms`)
}, 1000)

search('a')
setTimeout(() => search('b'), 200)
setTimeout(() => search('c'), 500)

// 预期输出（只有一次，时间约 1500ms，可能有几毫秒误差）：
// 搜索：c @ 约 1500ms
```

### 2. 手写节流

JavaScript.info 的实现（参数收集改用 rest 参数，逻辑一致）：

```js
function throttle(func, ms) {
  let isThrottled = false
  let savedArgs
  let savedThis

  function wrapper(...args) {
    if (isThrottled) {
      savedArgs = args
      savedThis = this
      return
    }

    isThrottled = true
    func.apply(this, args)

    setTimeout(function () {
      isThrottled = false

      if (savedArgs) {
        wrapper.apply(savedThis, savedArgs)
        savedArgs = savedThis = null
      }
    }, ms)
  }

  return wrapper
}
```

与防抖的三个关键差异：

1. 防抖只有一个定时器，且每次调用都**清除重来**；节流的定时器只负责"冷却到期"，**从不提前清除**。
2. 冷却期（`isThrottled === true`）内的调用不执行，只把参数和 this 存进 `savedArgs` / `savedThis`，后到的覆盖先到的。
3. 冷却结束后如果保存过调用，重放的是 **wrapper 而不是 func**：重放的这一次同样要重新进入冷却、安排下一个定时器。如果直接调 `func`，下一次调用就会失去节流。

时间线推演（`throttle(f, 1000)`，对应 JavaScript.info 的例子）：

```text
0ms    f1000(1) → 未冷却 → 立即执行，输出 1；进入冷却，定时器 1000ms 后到期
200ms  f1000(2) → 冷却中 → 仅保存参数 2
500ms  f1000(3) → 冷却中 → 覆盖保存为 3（中间值 2 被丢弃）
1000ms 定时器到期 → 冷却结束；有保存的调用 → 重放 wrapper → 立即执行，输出 3；
       再次进入冷却
2000ms 定时器到期 → 没有保存的调用 → 进入空闲
```

这个实现同时具备两种边缘行为：**窗口开始时立即执行**（leading，用户能立刻看到反应），**冷却结束后用最后一次参数补执行**（trailing，鼠标停下后的最终坐标也会被处理）。

### 3. lodash 的实现视角：throttle 是 debounce 的特例

lodash 源码（4.17.21，简化自实际源码，省略类型检查）中，`_.throttle` 就是调用了 `_.debounce`：

```js
function throttle(func, wait, options) {
  var leading = true
  var trailing = true

  if (isObject(options)) {
    leading = 'leading' in options ? !!options.leading : leading
    trailing = 'trailing' in options ? !!options.trailing : trailing
  }

  return debounce(func, wait, {
    leading: leading,
    maxWait: wait,
    trailing: trailing
  })
}
```

两个约束合在一起就是节流：

- 防抖自带的 `wait` 窗口保证**两次执行不会挨得太近**（最多多密）；
- `maxWait: wait` 保证**执行最多被推迟多久**（默认防抖只要一直触发就永不执行，`maxWait` 给了兜底）。

---

## 四、常见写法与推荐实践

### 1. `_.debounce(func, wait, options)`

| 参数 / 选项 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `func` | — | 需要防抖的函数 |
| `wait` | `0` | 静默等待的毫秒数 |
| `options.leading` | `false` | 是否在冷却期**开始**时立即执行（leading edge） |
| `options.trailing` | `true` | 是否在冷却期**结束**时用最后一次参数补执行（trailing edge） |
| `options.maxWait` | 不启用 | 函数最多被推迟多久就必须执行 |

返回的防抖函数带有两个辅助方法，常用于组件卸载时清理：

- `debounced.cancel()`：取消尚未执行的调用；
- `debounced.flush()`：立即执行尚未执行的调用。

另一个值得注意的行为：对防抖函数的后续调用会返回**最后一次** `func` 的执行结果。

官方文档中的用法（`jQuery` 写法改为 `addEventListener`）：

```js
// 窗口尺寸变化期间避免昂贵计算：停止调整 150ms 后重新计算布局
window.addEventListener('resize', _.debounce(calculateLayout, 150))

// 发送邮件：第一次点击立即发送（leading），冷却期内的连续点击被忽略
element.addEventListener('click', _.debounce(sendMail, 300, {
  leading: true,
  trailing: false
}))

// 防抖 + maxWait：无论消息多密集，batchLog 最多被推迟 1s 就会执行
const debounced = _.debounce(batchLog, 250, { maxWait: 1000 })

// 取消尚未执行的调用（如路由离开时）
window.addEventListener('popstate', debounced.cancel)
```

> **提示**（来自 lodash 文档）：当 `leading` 和 `trailing` 都为 `true` 时，冷却期结束处的补执行**只在该等待期内发生过多次调用**时才会发生。只调用一次时，leading 已经执行过，无需再补。

### 2. `_.throttle(func, wait, options)`

| 参数 / 选项 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `func` | — | 需要节流的函数 |
| `wait` | `0` | 两次执行的最小间隔毫秒数 |
| `options.leading` | `true` | 窗口开始时立即执行 |
| `options.trailing` | `true` | 窗口结束时用最后一次参数补执行 |

注意默认值与 `_.debounce` 相反：throttle 默认 `leading: true`（即时响应），debounce 默认 `leading: false`（只认安静后的那次）。

```js
// 滚动期间更新位置信息：最多每 100ms 更新一次
window.addEventListener('scroll', _.throttle(updatePosition, 100))

// 令牌续期：点击触发，两次续期至少间隔 5 分钟；到期前重复点击直接忽略
const throttled = _.throttle(renewToken, 300000, { trailing: false })
element.addEventListener('click', throttled)
```

### 3. leading 与 trailing 组合速查

| `leading` | `trailing` | 行为 | 典型用途 |
| :--- | :--- | :--- | :--- |
| `false` | `true`（debounce 默认） | 停止触发后才执行一次 | 搜索联想、输入校验、自动保存 |
| `true` | `false` | 触发瞬间执行，冷却期内忽略 | 按钮防重复点击、令牌续期 |
| `true` | `true`（throttle 默认） | 立即执行一次，窗口结束补最后一次 | 滚动、resize、鼠标移动 |
| `false` | `false` | 没有任何执行时机 | 无意义组合，不会执行 |

### 4. 实践建议

- 搜索输入用 debounce（常见 300–500ms）；需要"边输边出结果"时改用 throttle，并配合取消上一次请求（如 `AbortController`）。
- `scroll` / `resize` / `mousemove` 用 throttle。
- 防重复点击用 `_.debounce(fn, wait, { leading: true, trailing: false })`。
- **包装器要长期复用**：把 `debounce(fn, ms)` 的返回值保存起来注册为监听器，不要在事件回调里每次重新创建（见易错点 3）。
- 组件卸载、路由离开时调用 `cancel()`，清理未执行的定时器和保存的参数。
- `wait` 是"最早等待时间"而不是精确时间：浏览器繁忙时执行可能更晚，与事件循环笔记中 `setTimeout` 的结论一致。

---

## 五、易错点与边界条件

### 1. 错误理解：包装器可以用箭头函数写

**正确理解**：箭头函数没有自己的 `this` 和 `arguments`。用它当包装器，`this` 会指向包装器**定义处**的词法 this（全局或模块作用域），而 `arguments` 会拿到**外层工厂函数**的参数 `[func, ms]`——转发的 this 和参数全是错的：

```js
const badDebounce = (func, ms) => {
  let timeout

  return () => {
    clearTimeout(timeout)
    // 这里的 this：不是调用方的对象（非严格模式下是 window）
    // 这里的 arguments：是 badDebounce 的 [func, ms]，不是调用参数
    timeout = setTimeout(() => func.apply(this, arguments), ms)
  }
}
```

正确写法用普通 `function` 收集调用。一个容易记住的细分：**wrapper 本身必须是普通 function**（需要接收调用方的 this 和参数）；wrapper 内部安排定时器时**可以**用箭头函数——它恰好捕获 wrapper 的 this 并透传出去。

### 2. 错误理解：包装器会返回原函数的执行结果

**正确理解**：防抖把执行推迟了，调用包装器时 `func` 还没执行，因此同步拿到的返回值不是 `func` 的结果（手写版返回 `undefined`）。lodash 虽然会让后续调用返回最后一次的结果，但这只对"取最近一次结果"够用。如果业务依赖**每一次**调用的返回值，防抖和节流包装器都不是合适的工具。

### 3. 错误理解：在事件回调里每次新建包装器也一样有效

**正确理解**：防抖/节流的状态保存在包装器的闭包里。每次都新建包装器，等于每次都拿到全新的定时器和冷却状态，控制完全失效：

```js
// 错误：每次输入都创建新的防抖包装器，每次都会在 500ms 后执行一次，
// 等价于没有防抖
input.addEventListener('input', (event) => {
  debounce(handleSearch, 500)(event)
})

// 正确：包装器只创建一次，多次输入共享同一个定时器
const debouncedSearch = debounce(handleSearch, 500)
input.addEventListener('input', debouncedSearch)
```

### 4. 错误理解：防抖是"多久最多执行一次"

**正确理解**：那是节流。防抖在持续触发期间可能**一次都不执行**——定时器一直被重置。如果业务不允许无限推迟（例如自动保存），要么用 `maxWait` 兜底，要么改用节流：

```js
// 输入停顿 1s 后保存；但持续输入时最多推迟 5s，保证一定会保存
const save = _.debounce(persist, 1000, { maxWait: 5000 })
```

### 5. 错误理解：节流会丢失最后一次调用

**正确理解**：JavaScript.info 的实现和 lodash 的默认行为都带 trailing：冷却结束后会用**最后一次**调用的参数补一次执行，保证最终状态被处理（例如鼠标停下时的最终坐标）。lodash 也允许显式关闭 trailing；选型时先确认"最后一个事件要不要被处理"。

### 6. 边界：`wait` 为 0 不是"立即执行"

lodash 文档明确：`wait` 为 0 且 `leading` 为 `false` 时，调用被推迟到下一个 tick，类似 `setTimeout(fn, 0)`。它仍受事件循环约束——不是同步执行。利用这一点可以把同一轮同步代码里的一串调用合并成当前同步代码结束后的一次执行。

### 7. 边界：未清理的包装器会延长对象生命周期

防抖/节流的闭包持有 `func`、保存的参数（`savedArgs` / `lastArgs`）和未到期的定时器。如果包装器所属组件已卸载而定时器未清理，可能出现两类问题：回调在卸载后仍然执行（过期回调）；闭包引用让最后一次调用携带的大对象无法被回收（内存泄漏的常见来源之一）。lodash 提供 `cancel()` 清理；手写版也可以补一个：

```js
wrapper.cancel = () => clearTimeout(timeout)
```

---

## 六、调试与练习

### 1. 打点观察

在控制台用时间戳观察"输入流"与"实际执行"的时刻差：

```js
function debounce(func, ms) {
  let timeout

  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), ms)
  }
}

const now = () => Math.round(performance.now())

const onInput = debounce((value) => {
  console.log(`处理输入 "${value}" @ ${now()}ms`)
}, 500)

const inputs = ['v', 'vu', 'vue', 'vue3']

inputs.forEach((value, index) => {
  setTimeout(() => {
    console.log(`输入 "${value}" @ ${now()}ms`)
    onInput(value)
  }, index * 150)
})

// 预期输出：
// 输入 "v" @ 约 0ms
// 输入 "vu" @ 约 150ms
// 输入 "vue" @ 约 300ms
// 输入 "vue3" @ 约 450ms
// 处理输入 "vue3" @ 约 950ms（最后一次输入 450ms + 静默 500ms）
```

把 `onInput` 换成第三节的 `throttle` 实现，再观察输出时刻的差异。

### 2. 练习

#### 练习 1：预测防抖的执行时刻

```js
const d = debounce((v) => console.log(`执行 ${v}`), 300)

d('a')
setTimeout(() => d('b'), 100)
setTimeout(() => d('c'), 500)

// 输出什么？在什么时刻？
```

<details>
<summary>答案</summary>

只输出一次：`执行 c`，约在 800ms。

推演：0ms 的调用把定时器定到 300ms；100ms 的调用重置到 400ms；500ms 的调用重置到 800ms。执行参数只保留最后一次的 `'c'`。

</details>

#### 练习 2：预测节流的执行时刻

使用第三节的手写 `throttle`：

```js
const t = throttle((v) => console.log(`执行 ${v}`), 400)

t('a')
setTimeout(() => t('b'), 100)
setTimeout(() => t('c'), 500)

// 输出什么？各在什么时刻？
```

<details>
<summary>答案</summary>

输出三次：`执行 a` 约 0ms、`执行 b` 约 400ms、`执行 c` 约 800ms。

推演：0ms 立即执行 `a`，冷却到 400ms；100ms 的 `b` 被保存；400ms 冷却结束，重放保存的 `b` 并再次进入冷却；500ms 的 `c` 在冷却中被保存；800ms 冷却结束，重放 `c`。注意 `'c'` 的执行时刻（800ms）比它被调用的时刻（500ms）晚了 300ms。

</details>

#### 练习 3：为"按钮防重复点击"选型

按钮点击后要立即发起请求，但用户手抖连点时只算一次。应该用防抖还是节流？用什么配置？

<details>
<summary>答案</summary>

用防抖并打开 leading、关闭 trailing：

```js
const submit = _.debounce(doSubmit, 500, { leading: true, trailing: false })
button.addEventListener('click', submit)
```

原因：需要**第一次立即响应**（`leading: true`）；冷却期内的连点全部忽略；停止点击后**不需要**用最后一次点击补一次请求（`trailing: false`，否则手抖结束还会多发一次）。节流的 leading 版本也能防重复，但两次成功提交的间隔固定为 `wait`，语义不如防抖贴合"把一次动作产生的连点合并成一次"。

</details>

---

## 七、总结

| | 防抖 debounce | 节流 throttle |
| :--- | :--- | :--- |
| 执行时机 | 停止触发 `ms` 后执行一次 | 固定间隔内最多执行一次 |
| 持续触发期间 | 一直不执行（`maxWait` 可兜底） | 按节奏执行 |
| 保留哪次参数 | 最后一次 | 每个窗口内的最后一次 |
| 关注点 | 最终状态 | 过程反馈 |
| 典型场景 | 搜索输入、输入校验、自动保存 | 滚动、resize、鼠标移动 |
| lodash 默认 | `leading: false, trailing: true` | `leading: true, trailing: true` |
| 共同点 | 闭包保存状态、`func.apply` 转发 this 与参数、保留最后一次调用、延迟不精确（受事件循环影响） | |

记忆口诀：**防抖重置定时器，静默之后才执行；节流掐住冷却期，最多一次不越界；参数都留最后一次，最终状态不丢失。**

## 参考资料

- [防抖装饰器 - JavaScript.info 任务（中文）](https://zh.javascript.info/task/debounce)
- [Debounce - JavaScript.info task](https://javascript.info/task/debounce)
- [节流装饰器 - JavaScript.info 任务（中文）](https://zh.javascript.info/task/throttle)
- [Throttle - JavaScript.info task](https://javascript.info/task/throttle)
- [_.debounce - Lodash 官方文档](https://lodash.com/docs/#debounce)
- [_.throttle - Lodash 官方文档](https://lodash.com/docs/#throttle)
- [Debouncing and Throttling Explained Through Examples - CSS-Tricks](https://css-tricks.com/debouncing-throttling-explained-examples/)（lodash 文档中引用的两者对比文章）
