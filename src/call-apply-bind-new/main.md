# 手写 call、apply、bind、new、instanceof 与 Object.create

> 学习目标：能解释一次函数调用如何传入 `this` 和参数，能跟踪一次对象创建，再逐步完成七道手写题（`bind` 分为两个版本）。
>
> 本章写的是有明确范围的学习实现，不是原生 API 的完整替代品。第一次阅读先掌握主线，进阶部分可以以后再看。

**运行方式：** 每个 JavaScript 代码块都能独立运行，包含自己需要的函数与数据。先预测，再点“运行”核对。示例里的 `myCall`、`myApply`、`myBind` 只用于练习；项目业务代码直接使用原生方法。

**建议分三轮阅读，不必一次记住全部实现：**

| 轮次 | 阅读顺序 | 这一轮只解决什么 |
| --- | --- | --- |
| 第一轮：函数调用 | 第一至第四节 | `this` 和参数如何传入；为什么 `bind` 延后执行 |
| 第二轮：对象创建 | 第五至第九节 | 先理解 `new`，再理解原型连接和查找，最后组合出支持 `new` 的 `bind` |
| 第三轮：验收与边界 | 第十节；有余力再读第十一节 | 先预测输出，再判断学习版在哪些情况下不适用 |

本章会反复使用三个名字：`target` 是**要执行的函数**，`context` 是**希望传入的 this 值**，`args` 是**普通参数组成的数组**。变量名本身没有特殊能力，真正决定行为的是后面的调用表达式。

## 一、先看今天要解决什么问题

### 1. 同一个函数，使用不同对象的数据

这里的 `a`、`b` 是普通参数，`this` 是函数执行时使用的接收者。对于下面的普通函数，通过 `obj.calculate()` 调用时，`this` 就是 `obj`。

对象用 `{ 属性名: 属性值 }` 组织数据；`obj.value` 读取属性，`obj.value = 10` 修改属性。函数也是对象。把函数赋给另一个变量或对象属性时，保存的是**引用**，也就是找到同一个函数的方式，不会复制函数或执行它；函数名后加上 `(...)` 才表示调用。

```js
function fn(a, b) {
  return this.value + a + b
}

const obj = { value: 1, calculate: fn }

console.log(obj.calculate(2, 3)) // 6
```

`calculate: fn` 保存的是函数引用，没有执行 `fn`。随后 `obj.calculate(2, 3)` 才开始执行，此时 `this.value` 是 `1`，`a` 是 `2`，`b` 是 `3`。

对于这里的普通函数，`this` 要看**这一次怎样调用**，不是看函数最初写在哪个对象里。同一个函数可以由不同对象调用：

下面的 `===` 比较两个函数时，检查是否为同一个函数；`true` 表示成立，`false` 表示不成立。`try` 尝试执行代码，出错后进入 `catch`；这里暂时用 `error instanceof TypeError` 确认捕获的是类型错误，第八节再解释它的判断过程。

```js
function readValue() {
  'use strict'
  return this.value
}

const first = { value: 1, read: readValue }
const second = { value: 10, read: readValue }
console.log(first.read()) // 1
console.log(second.read()) // 10
console.log(first.read === second.read) // true

const detached = first.read
try {
  detached()
} catch (error) {
  console.log(error instanceof TypeError) // true
}
```

`detached()` 没有通过 `first` 调用。示例使用 `'use strict'` 明确启用严格模式，此时普通调用的 `this` 是 `undefined`，读取 `this.value` 会报错。函数引用没有变，调用方式变了。箭头函数使用外层的 `this`，不适用这里的方法调用规则；本章先使用普通函数推导。

如果不想长期给对象添加方法，原生 `call`、`apply`、`bind` 可以直接完成这个需求：

```js
function fn(a, b) {
  return this.value + a + b
}

const obj = { value: 1 }

console.log(fn.call(obj, 2, 3)) // 6
console.log(fn.apply(obj, [2, 3])) // 6

const bindFn = fn.bind(obj, 2)
console.log(typeof bindFn) // function
console.log(bindFn(3)) // 6
```

| 方法 | 什么时候执行原函数 | 普通参数怎么传 | 返回什么 |
| --- | --- | --- | --- |
| `call` | 立即执行 | 逐个传入 | 本次执行结果 |
| `apply` | 立即执行 | 数组或类数组对象 | 本次执行结果 |
| `bind` | 返回的新函数被调用时 | 绑定时预存一部分，调用时补上其余部分 | 一个新函数 |

`typeof` 返回类型名称，例如函数对应字符串 `'function'`。第一个参数 `obj` 不会传给 `a`，它用于指定 `this`。这三种方法的基础行为可对照 [MDN call](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call)、[MDN apply](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply) 和 [MDN bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)。

### 2. 为什么把方法写在 Function.prototype 上

普通函数也是对象。`Function.prototype` 是普通函数通常会沿原型链找到的共享对象；把 `myCall` 放在那里，才可以写 `fn.myCall(...)`。

第一次读到“原型链”可以先理解为：函数自己没有这个方法时，会去共享对象上找。第五节再展开它的结构。这里的 `Function.prototype` 提供所有普通函数可共享的方法，后面出现的 `Person.prototype` 则提供 `Person` 实例可共享的方法，两者不要混为一谈。

调用 `fn.myCall(obj, 2, 3)` 时，要分清两个位置的 `this`：

| 正在执行谁 | 这里的 `this` 是谁 | 为什么 |
| --- | --- | --- |
| `myCall` 方法 | `fn` | 是通过 `fn.myCall(...)` 调用的 |
| 原函数 `fn` | 希望是 `obj` | 这是 `myCall` 要实现的能力 |

因此，`myCall` 方法必须写成普通函数；写成箭头函数，就不能通过本次调用取得目标函数 `fn`。

这不是把同一个 `this` 改了两次，而是**两次函数调用各有自己的 this**：先调用 `myCall`，它再调用 `fn`。可以先把 `myCall` 中的 `this` 在脑中替换成“待执行的函数”，就容易读懂 `value: this` 了。

### 3. 先认识两种不同的 ...

在参数声明里，`...args` 是**剩余参数**：把其余实参收集成数组。在调用位置，`...args` 是**展开语法**：把数组拆成逐个实参。

```js
function sum(...args) {
  return args[0] + args[1]
}

const values = [2, 3]
console.log(sum(...values)) // 5

const preset = [2]
const later = [3]
console.log([...preset, ...later].join(',')) // 2,3
```

最后一行在新数组里依次展开两组参数。`bind` 会用这种方式，把“提前保存的参数”排在“后来传入的参数”前面。

## 二、题 1：从临时方法推导 myCall

### 1. 先手动完成一次

先把函数临时放在目标对象上，再通过这个对象调用，最后删除临时属性：

```js
function fn(a, b) {
  return this.value + a + b
}

const obj = { value: 1 }
obj.temp = fn

const result = obj.temp(2, 3)
delete obj.temp

console.log(result) // 6
console.log(Object.hasOwn(obj, 'temp')) // false
```

这里 `delete` 删除对象自己的属性，`Object.hasOwn` 检查对象自己是否有某个属性。问题是：如果 `obj` 本来就有 `temp`，赋值会覆盖旧值。函数如果抛错，普通的删除语句也不会执行。

### 2. 先补齐安全清理需要的工具

- `Symbol('temporary function')` 每次产生一个不同的 Symbol 值，可以作为属性键，避免覆盖已有的同名属性。
- `receiver[key]` 使用变量 `key` 的值作为属性键；不能写成 `receiver.key`。
- `try` 里执行可能抛错的调用；`finally` 在离开 `try` 时执行，包括正常返回和抛错。把清理放在这里，才不会漏掉。
- `globalThis` 表示当前环境的全局对象；浏览器窗口和 Worker 中都可以使用，不必写死 `window`。
- `Object(value)` 把原始值包装成对象；如果已经是对象，会返回它本身。

今天的临时属性版先约定：`null`、`undefined` 使用 `globalThis`，其他值使用 `Object(context)`。这接近非严格普通函数的常见结果；它不能保留严格函数接收到的 `null` 或原始值，具体反例见第十一节。

### 3. 完整实现与测试

先抓住核心的一行：`receiver[key](...args)`。其余代码分别负责检查输入、准备接收对象、添加临时方法和清理。

这里还需要认识**属性描述符**：`Object.defineProperty` 用配置对象定义属性。`value` 指定属性值，`configurable: true` 允许稍后删除。第一次阅读先记住这两个选项即可。`Reflect.ownKeys(obj)` 列出对象自己的所有属性键，后面用它检查有没有残留的临时属性。

<details>
<summary>选读：为什么不用 Object.keys 检查清理结果</summary>

`Object.keys` 只列出可枚举的字符串键，即使 Symbol 属性没有删除，它也看不到。`Reflect.ownKeys` 同时包含字符串键和 Symbol 键，不受可枚举性限制。本例没有设置 `enumerable`，临时属性默认也不可枚举；但“不可枚举”和“已经删除”是两回事。

</details>

```js
Function.prototype.myCall = function (context, ...args) {
  if (typeof this !== 'function') {
    throw new TypeError('myCall 的调用者必须是函数')
  }

  let receiver
  if (context === null || context === undefined) {
    receiver = globalThis
  } else {
    receiver = Object(context)
  }

  const key = Symbol('temporary function')
  Object.defineProperty(receiver, key, {
    value: this,
    configurable: true,
  })

  try {
    return receiver[key](...args)
  } finally {
    delete receiver[key]
  }
}

function fn(a, b) {
  return this.value + a + b
}

const obj = { value: 1 }
console.log(fn.myCall(obj, 2, 3)) // 6
console.log(Reflect.ownKeys(obj).length) // 1

function fail() {
  throw new Error('调用失败')
}

try {
  fail.myCall(obj)
} catch (error) {
  console.log(error.message) // 调用失败
}
console.log(Reflect.ownKeys(obj).length) // 1
```

对 `fn.myCall(obj, 2, 3)`，执行过程是：

1. 进入 `myCall`，其中 `this === fn`，`context === obj`，`args` 是 `[2, 3]`。
2. `receiver` 指向 `obj`，在它上面定义一个唯一的临时属性，属性值是 `fn`。
3. 通过 `receiver[key](...args)` 调用，所以 `fn` 中的 `this === obj`。
4. 原函数返回 `6`；`finally` 先删除临时属性，再把 `6` 返回给外层。
5. 如果原函数抛错，也先清理，然后错误继续向外传递。

**范围：** 接收者需要允许添加临时属性。冻结对象、不可扩展对象等不能使用这一方案。原生 `call` 不需要添加属性；临时挂载只是手写时借助方法调用规则的模拟方式，不是引擎实现 `call` 的步骤。

## 三、题 2：手写 myApply

`apply` 与 `call` 的调用目标相同，变化的是参数入口。先把本题的基础版限制为：第二个参数可以是数组、`null`、`undefined`；后两种表示不传普通参数。

```js
Function.prototype.myApply = function (context, argsArray) {
  if (typeof this !== 'function') {
    throw new TypeError('myApply 的调用者必须是函数')
  }

  let args = []
  if (argsArray !== null && argsArray !== undefined) {
    if (!Array.isArray(argsArray)) {
      throw new TypeError('本学习版只支持数组参数')
    }
    args = argsArray
  }

  let receiver
  if (context === null || context === undefined) {
    receiver = globalThis
  } else {
    receiver = Object(context)
  }

  const key = Symbol('temporary function')
  Object.defineProperty(receiver, key, {
    value: this,
    configurable: true,
  })

  try {
    return receiver[key](...args)
  } finally {
    delete receiver[key]
  }
}

function fn(a, b) {
  return this.value + a + b
}

function readValue() {
  return this.value
}

const obj = { value: 1 }
console.log(fn.myApply(obj, [2, 3])) // 6
console.log(readValue.myApply(obj)) // 1
console.log(readValue.myApply(obj, null)) // 1
```

这里不依赖前一块的 `myCall`，所以可以单独运行。`argsArray` 的 `[2, 3]` 被展开为两个实参，没有作为一个数组整体传给 `a`。

注意：`fn.apply(obj, null)` 表示不给 `fn` 传普通参数；`fn.apply(obj, [null])` 则传了一个参数，其值为 `null`。前者的参数列表为空，后者的参数列表有一项。

### 原生 apply 还支持类数组对象

**类数组对象**有 `length` 和数字下标，但不一定是数组，也不一定支持展开语法。原生方法能按下标读取参数：

```js
function fn(a, b) {
  return this.value + a + b
}

const obj = { value: 1 }
const argsLike = { 0: 2, 1: 3, length: 2 }

console.log(Array.isArray(argsLike)) // false
console.log(fn.apply(obj, argsLike)) // 6
```

本节手写版会拒绝上面的 `argsLike`，原生 `apply` 可以接受它。先记住这个范围差异，不必立即扩展实现。

<details>
<summary>选读：为什么不能直接展开类数组，或用 Array.from 替换原生处理</summary>

展开语法要求对象可迭代，也就是提供逐项取值的机制；只有 `length` 和下标的 `argsLike` 并不具备这个能力，所以 `...argsLike` 会报错。若题目要求支持类数组，可以按 `length` 逐个读取下标，还要处理长度转换与输入校验。`Array.from` 也不能无条件替换原生处理：它能读取 `Set` 的迭代结果，原生 `apply` 却按 `length` 和下标读取。准确转发的版本见第十一节。

</details>

## 四、题 3：手写 myBind 简化版

### 1. 新函数要记住什么

执行 `fn.myBind(obj, 2)` 时，不应调用 `fn`，只保存三项内容：原函数 `fn`、接收者 `obj`、预设参数 `[2]`。随后调用 `bindFn(3)`，才合并参数并执行。

先用普通赋值理解“保存对象引用”：

```js
const obj = { value: 1 }
const saved = obj
obj.value = 10

console.log(saved === obj) // true
console.log(saved.value) // 10
console.log(saved === { value: 10 }) // false
```

`saved = obj` 没有复制对象，两者找到的是同一个对象，所以能看到同一次属性修改。最后一行的 `{ value: 10 }` 创建了另一个对象，内容相同也不会让两个对象相等。`const` 限制变量重新赋值，不限制对象属性修改。

返回的函数仍能访问外层保存的变量，这就是**闭包**。保存的 `context` 是对象引用，不是对象数据的快照：以后修改 `obj.value`，调用时会读到新值。

本节允许使用原生 `apply`，把注意力放在闭包和参数拼接上；若题目禁止原生调用辅助方法，可以复用前面手写的调用逻辑，同时继承那些实现的限制。

### 2. 用箭头函数明确限定为普通调用

```js
Function.prototype.myBind = function (context, ...presetArgs) {
  if (typeof this !== 'function') {
    throw new TypeError('myBind 的调用者必须是函数')
  }

  const target = this
  return (...laterArgs) => {
    return target.apply(context, [...presetArgs, ...laterArgs])
  }
}

function fn(a, b) {
  return this.value + a + b
}

const obj = { value: 1 }
const bindFn = fn.myBind(obj, 2)

console.log(bindFn(3)) // 6
console.log(bindFn.call({ value: 100 }, 3)) // 6

obj.value = 10
console.log(bindFn(3)) // 15

try {
  new bindFn(3)
} catch (error) {
  console.log(error instanceof TypeError) // true
}
```

步骤是：先保存 `[2]`；调用新函数时收集 `[3]`；拼成 `[2, 3]`；把 `obj` 和这组参数交给 `target.apply`；最后返回原函数的结果。

这里有两个 `return`，作用不同：外层 `return (...laterArgs) => { ... }` 把**新函数**交给使用者；内层 `return target.apply(...)` 在将来调用时，把**原函数的执行结果**交给使用者。创建新函数时不会执行它的函数体。

`bindFn.call({ value: 100 }, 3)` 仍得到 `6`，因为包装函数最终明确执行的是 `target.apply(context, ...)`，其中保存的 `context` 仍是 `obj`。预设参数也不会被后来的参数覆盖，而是依次排在前面。

这里外层 `myBind` 必须是普通函数，才能取得目标函数；返回值使用箭头函数则是刻意的选择，因为这个简化版只负责普通调用，箭头函数不能通过 `new` 构造。

## 五、先补齐 new 与原型链的基础

### 1. 构造函数、prototype 与对象原型

**构造函数**是可以通过 `new` 调用来创建实例的函数。下面的 `Person` 用 `this.name` 给新对象添加属性。

`Person.prototype` 是构造函数的一个属性；实例的内部 `[[Prototype]]` 是原型链接，通过 `Object.getPrototypeOf(person)` 读取。它们名字相近，但属于不同位置。

`[[Prototype]]` 是规范描述内部关系的记号，不是在代码里直接访问的属性名。读示例时只用 `Object.getPrototypeOf(...)` 查看它即可。

```js
function Person(name) {
  this.name = name
}

Person.prototype.say = function () {
  return this.name
}

const person = new Person('小明')

console.log(person.name) // 小明
console.log(person.say()) // 小明
console.log(Object.hasOwn(person, 'name')) // true
console.log(Object.hasOwn(person, 'say')) // false
console.log(Object.getPrototypeOf(person) === Person.prototype) // true
```

`name` 在实例自己身上；`say` 在原型对象上。访问 `person.say` 时，先查实例自己，没找到，再沿原型链接查找。调用仍是 `person.say()`，所以方法里的 `this` 是 `person`。

<figure class="ref-diagram">
  <div class="ref-heading">两个表达式，得到同一个原型对象</div>
  <div class="ref-row">
    <div class="ref-sources"><span class="ref-name">Person.prototype</span><span class="ref-name">实例的原型</span></div>
    <span class="ref-arrow"></span>
    <div class="ref-object"><span class="ref-title">原型对象 A</span><span class="ref-value">say: 函数引用</span><span class="ref-value">constructor: Person</span></div>
  </div>
  <figcaption>实例创建后的关系：“实例的原型”表示 Object.getPrototypeOf(person) 的结果。两个入口都得到对象 A；person 自己的 name 属性不在 A 中。</figcaption>
</figure>

**原型链**就是不断读取对象原型得到的链。在本例中，从实例开始，依次是 `person`、`Person.prototype`、`Object.prototype`，最终到 `null`。`null` 表示没有更上一层原型。

### 2. new 的四个关键步骤

对本章使用的普通构造函数，可以按下面顺序理解：

1. 创建一个新对象。
2. 让它的原型指向构造函数的 `prototype`；如果这个属性不是对象，使用 `Object.prototype`。
3. 以新对象作为 `this` 执行构造函数，传入参数。
4. 如果构造函数显式返回对象或函数，采用那个返回值；否则采用刚才创建的新对象。

这是手写 `new` 的主线，原生行为可对照 [MDN new](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new)。第四步的判断不要只写 `typeof result === 'object'`：`null` 不是可采用的对象返回值，函数却是。

## 六、题 4：手写 new

`new` 是运算符，不能给它添加 `myNew` 方法。练习时使用 `myNew(Constructor, ...args)` 表达相同需求。

本版同样只面向普通构造函数。先用 `Object.create` 完成“创建对象并连接原型”，再用原生 `apply` 完成“以新对象作为接收者执行”，最后自己处理返回值。

这里先认识原生 `Object.create(proto)`：它创建一个空对象，并让对象的原型指向 `proto`，不会复制属性，也不会执行构造函数。第七节再练习它的实现；每道题允许借助的原生方法不同，不需要把所有工具一次全部重写。

下面会用到三元表达式 `条件 ? A : B` 表示条件成立时取 A，否则取 B。它只是在选择实例原型：可用的 `Constructor.prototype` 或默认的 `Object.prototype`。

下面的对象判断也可以拆开读：先排除 `null`，再接受 `typeof` 为 `'object'` 或 `'function'` 的值。原因是 `typeof null` 虽然是 `'object'`，但 `null` 不是对象；函数却属于可以作为原型或显式返回结果的对象。

```js
function myNew(Constructor, ...args) {
  if (typeof Constructor !== 'function') {
    throw new TypeError('Constructor 必须是函数')
  }

  const proto = Constructor.prototype
  const hasObjectPrototype = proto !== null && (
    typeof proto === 'object' || typeof proto === 'function'
  )
  const instance = Object.create(hasObjectPrototype ? proto : Object.prototype)
  const result = Constructor.apply(instance, args)

  if (result !== null && (typeof result === 'object' || typeof result === 'function')) {
    return result
  }
  return instance
}

function Person(name) {
  this.name = name
}
Person.prototype.say = function () {
  return this.name
}

function ReturnObject() {
  this.name = '实例上的名字'
  return { name: '返回对象上的名字' }
}

function ReturnNull() {
  this.value = 1
  return null
}

function ReturnFunction() {
  return function answer() {
    return 42
  }
}

const person = myNew(Person, '小明')
console.log(person.say()) // 小明
console.log(person instanceof Person) // true
console.log(Object.getPrototypeOf(person) === Person.prototype) // true
console.log(myNew(ReturnObject).name) // 返回对象上的名字
console.log(myNew(ReturnNull).value) // 1
console.log(myNew(ReturnFunction)()) // 42
```

| 构造函数显式返回什么 | `myNew` 最终采用什么 |
| --- | --- |
| 没有 `return`，或返回 `undefined` | 新实例 |
| 数字、字符串、布尔值、Symbol、BigInt | 新实例 |
| `null` | 新实例 |
| 对象、数组、函数 | 显式返回的值 |

这里的 `Constructor.apply` 仍是普通调用，所以构造函数内部的 `new.target` 是 `undefined`，也不能调用 `class` 构造器。想得到真正的构造语义，应使用 `new` 或 `Reflect.construct`。

## 七、题 5：手写 Object.create

### 1. 用一个空构造函数连接原型

前面已经知道：执行 `new Temporary()`，得到对象的原型会指向 `Temporary.prototype`。因此可以把它设置成传入的 `proto`，再创建一个空实例。

对于 `null` 要另行处理：如果只写 `Temporary.prototype = null`，`new Temporary()` 会回退到 `Object.prototype`，不能得到无原型对象。下面借助更底层的 `Object.setPrototypeOf` 处理这个分支。

```js
function myCreate(proto) {
  if (proto !== null && typeof proto !== 'object' && typeof proto !== 'function') {
    throw new TypeError('proto 必须是对象或 null')
  }

  if (proto === null) {
    return Object.setPrototypeOf({}, null)
  }

  function Temporary() {}
  Temporary.prototype = proto
  return new Temporary()
}

const proto = { value: 1 }
const obj = myCreate(proto)

console.log(Object.getPrototypeOf(obj) === proto) // true
console.log(obj.value) // 1
console.log(Object.hasOwn(obj, 'value')) // false

proto.value = 2
console.log(obj.value) // 2

obj.value = 3
console.log(obj.value) // 3
console.log(proto.value) // 2
console.log(Object.hasOwn(obj, 'value')) // true

const dictionary = myCreate(null)
console.log(Object.getPrototypeOf(dictionary) === null) // true
console.log(dictionary.toString) // undefined
console.log(Object.hasOwn(dictionary, 'value')) // false

try {
  myCreate(1)
} catch (error) {
  console.log(error instanceof TypeError) // true
}
```

`obj` 与 `proto` 是两个对象。最初 `obj` 没有自己的 `value`，读取会向原型查找。对本例普通可写的数据属性执行 `obj.value = 3` 后，会在 `obj` 自己身上创建同名属性，随后读取就先得到自己的 `3`。

这叫**属性遮蔽**，没有复制原型，也没有修改原型上的 `value`。访问器或不可写属性涉及额外赋值规则，当前例子先限定为普通可写数据属性。

### 2. 与 new 的区别

| 能力 | `Object.create(proto)` | `new Constructor(...args)` |
| --- | --- | --- |
| 创建一个新对象 | 是 | 通常会创建；显式对象返回值可能替代它 |
| 对象原型从哪里来 | 传入的 `proto` | 通常是 `Constructor.prototype` |
| 执行用户构造函数来初始化 | 否 | 是 |
| 可以直接指定空原型 `null` | 是 | 普通构造函数的 `prototype = null` 会回退 |

基础版只支持第一个参数。原生 `Object.create` 还支持第二个参数：它是**属性描述符的集合**，不是直接要复制的属性值，详见 [MDN Object.create](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create)。

<details>
<summary>选读：增加第二个参数 propertiesObject</summary>

`Object.defineProperties` 可以批量定义属性。每个属性的配置里，`value` 是值，`writable` 表示能否修改，`enumerable` 表示是否参与枚举，`configurable` 表示能否删除或重新配置；这些布尔选项省略时默认为 `false`。

```js
function myCreate(proto, propertiesObject) {
  if (proto !== null && typeof proto !== 'object' && typeof proto !== 'function') {
    throw new TypeError('proto 必须是对象或 null')
  }

  let obj
  if (proto === null) {
    obj = Object.setPrototypeOf({}, null)
  } else {
    function Temporary() {}
    Temporary.prototype = proto
    obj = new Temporary()
  }

  if (propertiesObject !== undefined) {
    Object.defineProperties(obj, propertiesObject)
  }
  return obj
}

const obj = myCreate(null, {
  value: { value: 1, writable: true, enumerable: true, configurable: true },
  hidden: { value: 2 },
})

console.log(obj.value) // 1
console.log(obj.hidden) // 2
console.log(Object.keys(obj).join(',')) // value
console.log(Object.getPrototypeOf(obj) === null) // true
```

这个扩展仍借助原生属性定义工具完成描述符处理，练习重点是对象创建与原型连接。

</details>

## 八、题 6：手写 instanceof

### 1. 检查的是原型链，不是 constructor 属性

在默认规则下，`value instanceof Constructor` 检查：`Constructor.prototype` 是否出现在 `value` 的原型链上。比较的是同一个对象，而不是属性内容相同。[MDN instanceof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof) 说明了这一规则及自定义判断的例外。

本题先限定右侧为普通函数或类，并使用默认原型链判断；不模拟自定义 `Symbol.hasInstance` 和原生绑定函数的特殊行为。

```js
function myInstanceof(value, Constructor) {
  if (typeof Constructor !== 'function') {
    throw new TypeError('本学习版要求右侧是函数')
  }

  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return false
  }

  const targetPrototype = Constructor.prototype
  if (targetPrototype === null || (
    typeof targetPrototype !== 'object' && typeof targetPrototype !== 'function'
  )) {
    throw new TypeError('右侧的 prototype 必须是对象')
  }

  let current = Object.getPrototypeOf(value)
  while (current !== null) {
    if (current === targetPrototype) {
      return true
    }
    current = Object.getPrototypeOf(current)
  }
  return false
}

function Person() {}
const person = new Person()

console.log(myInstanceof(person, Person)) // true
console.log(myInstanceof(person, Object)) // true
console.log(myInstanceof([], Array)) // true
console.log(myInstanceof(1, Number)) // false
console.log(myInstanceof(new Number(1), Number)) // true
console.log(myInstanceof(null, Object)) // false
console.log(myInstanceof(function example() {}, Function)) // true
console.log(myInstanceof(Person.prototype, Person)) // false

const forged = Object.create(Person.prototype)
forged.constructor = Array
console.log(myInstanceof(forged, Person)) // true
```

以 `myInstanceof(person, Object)` 为例：

1. 要找的对象是 `Object.prototype`。
2. `current` 从 `Person.prototype` 开始，第一次不相等。
3. 向上移动到 `Object.prototype`，第二次相等，返回 `true`。
4. 如果一直没找到，最终到 `null`，返回 `false`。

必须从 `Object.getPrototypeOf(value)` 开始，不能直接比较 `value` 自己。因此 `Person.prototype instanceof Person` 在这个普通例子中是 `false`。

最后一个例子没有执行 `Person`，也把 `constructor` 改成了 `Array`，结果依然是 `true`。这说明默认 `instanceof` 检查当前原型链，不能证明对象历史上确实通过某个构造函数创建。

## 九、题 7：手写 myBind，支持 new 版

**这是组合题。** 前面已经分别学过 `new`、`Object.create` 和原型链判断，现在把这些能力加到第四节的简化版 `bind` 中。

### 1. new 必须优先使用新实例

原生绑定函数作为构造函数使用时，绑定的 `context` 会被忽略，预设参数仍会保留。这个规则可对照 [MDN bind 的构造调用说明](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#bound_functions_used_as_constructors)。

因此返回的函数要改成普通函数，并区分两条路径：普通调用使用 `context`；构造调用使用 `new` 创建的实例。

**`new.target`** 是普通函数内部的特殊表达式：普通调用时为 `undefined`，构造调用时指向本次构造使用的函数。它可以直接判断是否走构造路径，不需要猜测 `this` 的原型。

还需要 `Object.create(proto)`：创建一个新对象，并让它的原型指向 `proto`，不会执行构造函数，也不会复制 `proto` 的属性。`proto` 可以是普通对象，不需要有“对应的构造函数”。第七节已经练习过它的实现。

### 2. 学习版实现：面向普通构造函数

```js
Function.prototype.myBind = function (context, ...presetArgs) {
  if (typeof this !== 'function') {
    throw new TypeError('myBind 的调用者必须是函数')
  }

  const target = this

  function bound(...laterArgs) {
    const args = [...presetArgs, ...laterArgs]
    if (new.target !== undefined) {
      return target.apply(this, args)
    }
    return target.apply(context, args)
  }

  const proto = target.prototype
  if (proto !== null && (typeof proto === 'object' || typeof proto === 'function')) {
    bound.prototype = Object.create(proto)
    Object.defineProperty(bound.prototype, 'constructor', {
      value: bound,
      writable: true,
      configurable: true,
    })
  }

  return bound
}

function Person(name, age) {
  this.name = name
  this.age = age
}

Person.prototype.say = function () {
  return this.name
}

const context = { name: '原对象' }
const BoundPerson = Person.myBind(context, '小明')
const person = new BoundPerson(18)

console.log(person.name) // 小明
console.log(person.age) // 18
console.log(person.say()) // 小明
console.log(context.name) // 原对象
console.log(person instanceof Person) // true
console.log(person instanceof BoundPerson) // true
console.log(Object.getPrototypeOf(person) === Person.prototype) // false

BoundPerson(20)
console.log(context.age) // 20
```

`new BoundPerson(18)` 的过程：

1. 外层 `new` 创建实例，并让它的原型指向 `bound.prototype`。
2. 进入 `bound`，`new.target` 不是 `undefined`，`this` 是刚创建的实例。
3. 合并参数得到 `['小明', 18]`，在这个实例上执行 `Person`，写入 `name`、`age`。
4. `Person` 没有显式返回值，所以 `target.apply` 返回 `undefined`，`bound` 也返回 `undefined`。
5. 外层 `new` 根据自己的返回规则，最终返回实例。

如果 `Person` 显式返回对象或函数，`bound` 会把这个返回值原样传出去，由外层 `new` 采用。**不必在这个包装函数里再复制一遍 `new` 的返回判断。**

原型链是：实例 → `bound.prototype` → `Person.prototype` → `Object.prototype` → `null`。所以两次 `instanceof` 都为 `true`，但实例的直接原型不是 `Person.prototype`。

为什么不写 `bound.prototype = target.prototype`？那会让两个函数共享同一个原型对象；以后修改 `bound.prototype` 上的属性，也会改动原构造函数的原型。使用 `Object.create` 增加一层独立对象，可以避免这一点。

代码中重新定义 `constructor` 只是让 `bound.prototype.constructor` 指向 `bound`，方便观察；它不负责连接原型，也不决定 `instanceof` 的结果。真正建立链接的是前一行 `Object.create(proto)`。而且独立的一层并不是深拷贝：继续沿原型链读取时，仍会读到 `Person.prototype` 上的属性。

**范围：** 这里支持的是常见普通构造函数，仍有原型层级差异；不支持 `class` 构造器、箭头函数的构造限制、正确转发 `new.target` 等全部原生行为。不能把 `typeof target === 'function'` 当作“目标一定可构造”的证明。进阶改法见第十一节。

## 十、第一阶段练习与验收

### 1. 跑通题目给出的测试

下面把前三题放在同一块，保留题目里的调用方式。这里 `myApply` 复用本块定义的 `myCall`，`myBind` 使用简化版。

```js
Function.prototype.myCall = function (context, ...args) {
  if (typeof this !== 'function') {
    throw new TypeError('myCall 的调用者必须是函数')
  }
  const receiver = context === null || context === undefined ? globalThis : Object(context)
  const key = Symbol('temporary function')
  Object.defineProperty(receiver, key, { value: this, configurable: true })
  try {
    return receiver[key](...args)
  } finally {
    delete receiver[key]
  }
}

Function.prototype.myApply = function (context, argsArray) {
  if (typeof this !== 'function') {
    throw new TypeError('myApply 的调用者必须是函数')
  }
  if (argsArray !== null && argsArray !== undefined && !Array.isArray(argsArray)) {
    throw new TypeError('本学习版只支持数组参数')
  }
  const args = argsArray === null || argsArray === undefined ? [] : argsArray
  return this.myCall(context, ...args)
}

Function.prototype.myBind = function (context, ...presetArgs) {
  if (typeof this !== 'function') {
    throw new TypeError('myBind 的调用者必须是函数')
  }
  const target = this
  return (...laterArgs) => target.apply(context, [...presetArgs, ...laterArgs])
}

function fn(a, b) {
  return this.value + a + b
}

const obj = { value: 1 }

console.log(fn.myCall(obj, 2, 3)) // 6
console.log(fn.myApply(obj, [2, 3])) // 6

const bindFn = fn.myBind(obj, 2)
console.log(bindFn(3)) // 6
```

### 2. 先预测：this 参数会占据普通参数的位置吗

先写下四项输出，再运行。重点观察 `this`、第一个普通参数和参数数量：

```js
function describe(...args) {
  console.log(this.value, args.length, args[0])
}

const obj = { value: 10 }
describe.call(obj, 2, 3)
describe.apply(obj, [2, 3])
describe.apply(obj, null)
describe.apply(obj, [null])
```

<details>
<summary>答案与原因</summary>

四行依次是 `10 2 2`、`10 2 2`、`10 0 undefined`、`10 1 null`。每行分别显示接收对象的 `value`、参数数量、第一个参数。`obj` 用来指定 `this`，不进入 `args`；`null` 参数列表代表零个参数，读取不存在的 `args[0]` 得到 `undefined`，`[null]` 则明确传了一个值为 `null` 的参数。

把 `[null]` 改成 `[5]`，最后一行应变成 `10 1 5`。如果前两项无法解释，回看第一至第三节。

</details>

### 3. 先预测：bind 保存的是快照吗

```js
function fn(a, b) {
  return this.value + a + b
}

const obj = { value: 1 }
const bound = fn.bind(obj, 2)
obj.value = 10

console.log(bound(3))
console.log(bound.call({ value: 100 }, 3))
```

<details>
<summary>答案与原因</summary>

两次都是 `15`。绑定保存了 `obj` 的引用和预设参数 `2`；调用时读到的 `obj.value` 已经是 `10`。对原生绑定函数再使用 `call`，不能换掉它已经绑定的接收者。

不会解释时回看第四节，尝试把 `obj.value` 改成 `20` 再运行。

</details>

### 4. 先预测：返回对象后，还能通过原型找到方法吗

```js
function Person(name) {
  this.name = name
  return { name: '另一个对象' }
}

Person.prototype.say = function () {
  return this.name
}

const context = { name: '原对象' }
const BoundPerson = Person.bind(context, '小明')
const person = new BoundPerson()

console.log(person.name)
console.log(context.name)
console.log(person instanceof Person)
console.log(person instanceof BoundPerson)
console.log(typeof person.say)
```

<details>
<summary>答案与原因</summary>

依次是：`另一个对象`、`原对象`、`false`、`false`、`undefined`。

`new` 忽略绑定的 `context`，先创建并初始化实例，但 `Person` 返回了另一个普通对象，最终采用这个返回对象。它的原型链没有 `Person.prototype`，所以找不到 `say`，也无法通过这两次默认的实例判断。

不会解释时回看第五、第六、第九节。删除 `return` 后，再预测五项输出。

</details>

### 5. 先预测：prototype 换了，旧实例会跟着换吗

```js
function Person() {}

const oldPrototype = Person.prototype
const person = new Person()
Person.prototype = {}

console.log(Object.getPrototypeOf(person) === oldPrototype)
console.log(person instanceof Person)
console.log(Object.create(Person.prototype) instanceof Person)
```

<details>
<summary>答案与原因</summary>

依次是 `true`、`false`、`true`。旧实例仍连接旧原型对象；现在的 `instanceof` 却查找新的 `Person.prototype`。最后创建的对象连接新原型，因此判断成立。

不会解释时回看第七、第八节：区分“替换构造函数的 prototype 属性”和“修改某个对象的原型链接”。

</details>

### 6. 七题验收清单

| 题目 | 能独立解释这些问题，就算通过第一阶段 |
| --- | --- |
| 手写 `call` | `myCall` 的 `this` 是谁？为什么临时方法能改变原函数的接收者？抛错后怎么清理？ |
| 手写 `apply` | 数组参数在哪里被拆开？`null` 参数列表与 `[null]` 有什么区别？ |
| 手写简化 `bind` | 哪一步只保存信息？哪一步执行？两组参数为什么要按这个顺序拼接？ |
| 手写 `new` | 四步顺序是什么？为什么 `null` 与函数返回值要分别判断？ |
| 手写 `Object.create` | 为什么不用执行目标构造函数？为什么 `proto = null` 要另行处理？ |
| 手写 `instanceof` | 从哪里开始查找？何时返回？为什么不能只看 `constructor`？ |
| 手写支持 `new` 的 `bind` | 如何判断构造调用？为什么不使用绑定对象？返回对象时谁处理结果？ |

调试时可在浏览器控制台给 `myCall` 的调用行、`bound` 的条件分支、`myNew` 的返回判断、`myInstanceof` 的循环内分别打断点。观察 `this`、`args`、`new.target`、`current`，再单步执行。不要在笔记运行器里只写 `debugger` 就期待自动展示这些值。

## 十一、进阶选读：面试实现与原生行为的边界

### 1. 严格模式的 this 不能被提前包装

严格函数会保留原生调用传入的 `this`；转换行为由目标函数的规则决定，不是由写 `call` 的位置决定。

```js
function readThis() {
  'use strict'
  return this
}

console.log(readThis.call(null) === null) // true
console.log(readThis.call(1) === 1) // true
console.log(readThis.call(undefined) === undefined) // true

// 模拟临时属性版预先包装后的接收者
const boxed = Object(1)
boxed.read = readThis
console.log(boxed.read() === 1) // false
console.log(typeof boxed.read()) // object
```

临时属性方案只能通过对象调用，不能把严格函数中的 `this` 精确设置为 `null`、`undefined` 或原始值。不要宣称“用 `Object(context)` 后与原生 `call` 完全一致”。

箭头函数则捕获外层的 `this`，原生 `call`、`apply`、`bind` 都不能把它替换成指定对象：

```js
function makeArrow() {
  return () => this.value
}

const arrow = makeArrow.call({ value: 1 })
console.log(arrow.call({ value: 100 })) // 1
console.log(arrow.bind({ value: 200 })()) // 1
```

### 2. Reflect.apply：准确转发，不修改接收者

`Reflect.apply(target, thisArg, argumentsList)` 直接执行调用，参数列表可以是数组或类数组对象。它是可用的原生底层能力，不是“完全不使用原生调用工具的手写答案”。

```js
function invokeCall(target, context, ...args) {
  return Reflect.apply(target, context, args)
}

function invokeApply(target, context, argsArray) {
  const args = argsArray === null || argsArray === undefined ? [] : argsArray
  return Reflect.apply(target, context, args)
}

function fn(a, b) {
  return this.value + a + b
}
function readThis() {
  'use strict'
  return this
}

const obj = Object.freeze({ value: 1 })
console.log(invokeCall(fn, obj, 2, 3)) // 6
console.log(invokeApply(fn, obj, { 0: 2, 1: 3, length: 2 })) // 6
console.log(invokeCall(readThis, null) === null) // true
```

这样解决了临时属性的限制，也保留了严格函数的接收者。`invokeApply` 自己处理了参数列表为 `null`、`undefined` 的情况，因为 `Reflect.apply` 要求第三个参数是对象。

### 3. Reflect.construct：真正进入构造路径

`Reflect.construct(target, args, newTarget)` 调用目标的构造能力。第三个参数决定构造时的 `new.target`，也参与选择实例原型，省略时默认为 `target`。相关内部调用与构造规则可查 [ECMAScript 规范](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function.prototype.bind)。

```js
function myBindWithReflect(target, context, ...presetArgs) {
  if (typeof target !== 'function') {
    throw new TypeError('target 必须是函数')
  }

  function bound(...laterArgs) {
    const args = [...presetArgs, ...laterArgs]
    if (new.target !== undefined) {
      const newTarget = new.target === bound ? target : new.target
      return Reflect.construct(target, args, newTarget)
    }
    return Reflect.apply(target, context, args)
  }
  return bound
}

class Person {
  constructor(name) {
    this.name = name
    this.createdBy = new.target
  }
}

const BoundPerson = myBindWithReflect(Person, null, '小明')
const person = new BoundPerson()

console.log(person.name) // 小明
console.log(person.createdBy === Person) // true
console.log(Object.getPrototypeOf(person) === Person.prototype) // true
console.log(person instanceof Person) // true
console.log(person instanceof BoundPerson) // false

const boundArrow = myBindWithReflect(() => 1, null)
try {
  new boundArrow()
} catch (error) {
  console.log(error instanceof TypeError) // true
}
```

这个版本能构造 `class`，并让不可构造目标在真正构造时抛错。直接 `new BoundPerson()` 时转发 `Person` 作为 `newTarget`，于是实例直接连接 `Person.prototype`。

但它仍然不是完整的原生 `bind`：返回的 `bound` 是普通包装函数，有自己的 `prototype`，默认 `instanceof BoundPerson` 查找的是这个包装函数的原型，因此上面的结果为 `false`。原生绑定函数没有自己的 `prototype` 属性，却能把实例判断转交给内部保存的目标函数；此外还有 `name`、`length` 等差异。

### 4. 为什么 this instanceof bound 不能精确判断 new

普通调用也可以人为指定一个连接 `bound.prototype` 的对象作为接收者：

```js
function bound() {
  console.log(this instanceof bound) // true
  console.log(new.target === undefined) // true
}

const fake = Object.create(bound.prototype)
bound.call(fake)
```

它走的是普通调用，却让 `this instanceof bound` 成立。因此第九节使用 `new.target` 判断调用方式；“对象具有某种原型”与“这次进行了构造调用”不是同一个问题。

### 5. instanceof 还有哪些特殊情况

- `Symbol.hasInstance` 允许自定义右侧的判断逻辑，不一定遍历原型链；第八节没有实现它。
- 原生绑定函数会按绑定目标处理实例判断，不能因为它没有自己的 `prototype` 就认定所有实例判断都应该抛错。
- 不同窗口或 iframe 有各自的内置原型，跨窗口数组可能无法通过当前窗口的 `instanceof Array`。判断是否为数组，使用 `Array.isArray`。
- `constructor` 是可修改或继承的普通属性，不能代替原型链检查。

### 6. 别把练习里的原型扩展带进业务代码

示例直接给 `Function.prototype.myCall` 等赋值，方便按题目测试；赋值产生的属性可枚举，并且会影响同一环境中的其他函数。库代码应优先使用独立工具函数，避免修改内置原型。如果确实要添加方法，应明确兼容范围，并通过属性描述符控制可枚举性等行为。

## 回顾

学完后可以沿两条执行路线复述：

1. 调用路线：确定目标函数 → 指定接收者 → 整理参数 → 执行 → 返回与清理。`bind` 在前面增加“先保存，稍后执行”。
2. 对象路线：创建对象 → 连接原型 → 执行初始化 → 处理显式返回值。`Object.create` 只负责创建与连接；默认 `instanceof` 沿已有的原型链查找。

七题都能写出来之后，再用严格接收者、冻结对象、类数组、返回对象、原型替换这些条件验证自己理解的是哪些行为，以及实现还有哪些限制。

## 参考资料

- [MDN：Function.prototype.call](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call)
- [MDN：Function.prototype.apply](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)
- [MDN：Function.prototype.bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)
- [MDN：new 运算符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new)
- [MDN：instanceof 运算符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof)
- [MDN：Object.create](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create)
- [ECMAScript：Function.prototype.bind 与相关内部语义](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-function.prototype.bind)
