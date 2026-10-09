# JavaScript 深拷贝：从递归到循环引用与特殊类型

> 学习目标：能解释赋值、浅拷贝和深拷贝的区别，能手写基础版与循环引用版 `deepClone`，并扩展到 Date、RegExp、Map、Set。
>
> 主线是“递归复制数据 + 缓存对象对应关系 + 按类型创建容器”。面向开始系统补充 JavaScript 基础的开发者；练习版有明确的支持范围，不追求复制所有 JavaScript 对象。

---

## 一、先建立整体认识

### 1. 深拷贝解决什么问题

编辑一份嵌套数据时，我们经常希望保留原始数据作为对照。如果副本里的嵌套对象仍然指向原对象，修改副本就会影响原始数据。

**浅拷贝创建新对象并复制属性值；属性值如果是对象引用，复制后仍指向同一个对象。深拷贝会继续复制支持范围内的嵌套对象。** 这也是 [MDN：浅拷贝](https://developer.mozilla.org/en-US/docs/Glossary/Shallow_copy) 与 [深拷贝](https://developer.mozilla.org/en-US/docs/Glossary/Deep_copy) 区分两者的关键。

```js
const source = { profile: { name: '小明' } }
const assigned = source  // 引用赋值
const shallow = { ...source }  // 浅拷贝

console.log(assigned === source) // true：赋值没有创建新对象
console.log(shallow === source) // false：shallow 与 source 是不同对象
console.log(shallow.profile === source.profile) // true：两个 profile 属性指向同一个对象

shallow.profile.name = '小红'
console.log(source.profile.name) // 小红：通过共享引用修改了同一个对象
```

这里比较对象的 `===`，比较的是**是否为同一个对象**，而不是里面的字段是否相等。

`profile` 是一个属性，它的值是对 `{ name: '小明' }` 这个对象的引用。`{ ...source }` 复制这个属性值时，不会再创建一份 `{ name: '小明' }`，所以 `source.profile` 和 `shallow.profile` 仍指向同一个对象：

```text
source.profile  ──┐
                  ├──> 同一个对象 { name: '小明' }
shallow.profile ──┘
```

因此，`shallow.profile.name = '小红'` 修改的对象，也正是 `source.profile` 指向的对象。

区分这三种操作，只需检查对应的代码：

| 操作 | source 与副本是否为同一个对象 | 两边的 profile 是否为同一个对象 |
| :--- | :--- | :--- |
| `const assigned = source` | 是 | 是 |
| `const shallow = { ...source }` | 否 | 是 |
| 使用后文的 `deepClone(source)` | 否 | 否 |

“嵌套对象”在这个例子中就是 `source.profile` 指向的对象。

---

## 二、基础概念与递归出口

### 1. 基本类型与对象

基本类型包括 `undefined`、`null`、布尔值、数字、字符串、Symbol 和 BigInt。本笔记的手写实现对它们直接返回原值。

数组、普通对象、Date、RegExp、Map、Set 都是对象，需要按类型创建新容器。函数也是对象，但 `typeof` 返回 `'function'`，因此下面的判断会直接返回函数原引用；这里没有复制函数的代码或闭包。

```js
console.log(typeof null) // object
console.log(typeof []) // object
console.log(typeof {}) // object
console.log(typeof (() => {})) // function
console.log(Array.isArray([])) // true
```

这解释了递归出口为什么要单独判断 `null`：

```js
function isCloneableObject(value) {
  return value !== null && typeof value === 'object'
}

console.log(isCloneableObject(null)) // false
console.log(isCloneableObject({})) // true
console.log(isCloneableObject([])) // true
```

这里的函数只判断是否进入对象处理分支，不代表所有对象类型都能被练习版复制。

### 2. 为什么 `typeof null === 'object'`

这是 JavaScript 的历史遗留行为。早期实现用类型标记表示值，对象的标记为 0，`null` 的表示也被识别为这个标记。该结果为了兼容已有代码保留至今。**语言分类上，`null` 仍然是基本类型，不是对象。** 参见 [MDN：typeof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)。

面试回答不用深入引擎细节，记住“历史兼容行为 + `null` 是基本类型 + 判断对象时单独排除 `null`”即可。

---

## 三、必写代码：基础版，支持数组和普通对象

### 1. 实现与最小验证

下面保留刷题要求中的基础实现。示例针对普通对象和常规数组，且数据中没有循环引用。

```js
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  const result = Array.isArray(obj) ? [] : {}

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = deepClone(obj[key])
    }
  }

  return result
}

const source = { user: { name: '小明' }, list: [{ score: 80 }] }
const copy = deepClone(source)

console.log(copy === source) // false
console.log(copy.user === source.user) // false
console.log(Array.isArray(copy.list)) // true
console.log(copy.list[0] === source.list[0]) // false

copy.user.name = '小红'
copy.list[0].score = 100
console.log(source.user.name) // 小明
console.log(source.list[0].score) // 80
```

结果表明 `copy`、`copy.user`、`copy.list` 和 `copy.list[0]` 都是新对象，修改副本不会影响这份原数据。

### 2. 每一步在做什么

1. **递归出口**：基本类型直接返回，`null` 也直接返回。
2. **创建容器**：数组用 `[]`，普通对象用 `{}`。只用 `{}` 会把数组复制成带数字键的普通对象。
3. **筛选属性**：`for...in` 遍历可枚举的字符串键，包括继承来的键；`hasOwnProperty.call` 只留下自有属性。
4. **递归复制**：每个属性值重新进入 `deepClone`，直到碰到递归出口。
5. **返回容器**：把已经填充好的新对象返回给上一层。

```text
deepClone(source)
  ├── 创建新对象，最终返回为 copy
  ├── deepClone(source.user)
  │     ├── 创建新对象，最终赋给 copy.user
  │     └── deepClone('小明') → 直接返回字符串
  └── deepClone(source.list)
        ├── 创建 []
        └── deepClone(source.list[0]) → 创建对象并复制 score
```

### 3. 为什么不用 `obj.hasOwnProperty(key)`

对象可能有同名自有属性，也可能完全没有 `Object.prototype`。直接调用对象自己的方法并不可靠。

```js
const source = Object.create(null)
source.hasOwnProperty = '同名数据'
source.name = '小明'

console.log(typeof source.hasOwnProperty) // string：不是可调用的方法
console.log(Object.prototype.hasOwnProperty.call(source, 'name')) // true
console.log(Object.hasOwn(source, 'name')) // true：现代 API，含义相同
```

必写代码使用 `Object.prototype.hasOwnProperty.call`，便于阅读兼容写法；现代环境也可以使用 `Object.hasOwn(obj, key)`。基础版能读取无原型对象的字段，但复制结果是 `{}`，不会保留它的空原型。

### 4. 基础版的两个明显缺口

- 遇到 `source.self = source` 会无限递归，最终可能抛出调用栈溢出错误。
- 遇到两个属性指向同一对象，会各复制一次，丢失原来的共享关系。

特殊类型、Symbol 键、属性描述符等限制会在后面单独说明。不要把这个模板当作通用生产实现。

---

## 四、必写代码：用 WeakMap 支持循环引用

### 1. 先看基础版会遇到的两个问题

#### 问题一：对象的属性引用了对象自己

```js
const source = { name: '小明' }
source.self = source

console.log(source.self === source) // true
console.log(source.self.self === source) // true
```

`self` 是我们自己添加的普通属性名，不是特殊语法。`source.self = source` 把 `source` 所引用的对象赋给它自己的 `self` 属性，没有创建第二个对象。

因此，读取 `source.self` 得到的还是这个对象；继续读取 `source.self.self`，得到的也还是它。这是**循环引用**的一种情况。

基础版复制时会读取每个属性，并递归复制属性值。读到 `self` 时，它又开始复制同一个 `source`；再次读到 `self`，又复制同一个 `source`，一直重复，无法结束。

要处理这个问题，函数需要记住“这个对象已经开始复制了”，再次遇到它时直接返回已经创建的副本。复制完成后，`copy.self` 应当引用 `copy` 自己，不能引用原来的 `source`。

#### 问题二：两个属性引用了同一个对象

```js
const shared = { count: 1 }
const source = { left: shared, right: shared }

console.log(source.left === source.right) // true

source.left.count = 2
console.log(source.right.count) // 2
```

这里 `shared`、`left`、`right` 都只是示例中的变量名或属性名。创建 `source` 时，两次使用了同一个 `shared`，因此 `source.left` 和 `source.right` 引用的是同一个对象。这叫**共享引用**。

复制后也需要保留这个关系：`copy.left` 与 `copy.right` 应当引用同一个新对象；这个新对象与原来的 `shared` 分开，所以修改副本不会修改 `shared`。

基础版没有记录已经复制过哪些对象，会在复制 `left`、`right` 时分别创建一个新对象，导致它们不再相等。记录“原对象对应哪个副本”就能避免重复创建，也能解决上一种循环引用问题。

### 2. 实现与验证

`WeakMap` 在这里充当缓存，保存“**原对象 → 对应的新对象**”。下面保留刷题要求中的循环引用版本。

```js
function deepClone(obj, map = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (map.has(obj)) {
    return map.get(obj)
  }

  const result = Array.isArray(obj) ? [] : {}

  map.set(obj, result)

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = deepClone(obj[key], map)
    }
  }

  return result
}

const shared = { count: 1 }
const source = { left: shared, right: shared }
source.self = source
const copy = deepClone(source)

console.log(copy !== source) // true：copy 与 source 是不同对象
console.log(copy.self === copy) // true：副本指向自身
console.log(copy.self === source) // false：没有指回原对象
console.log(copy.left === copy.right) // true：保留共享关系
console.log(copy.left === shared) // false：共享的是新对象
```

### 3. 为什么必须先缓存，再递归

对 `source.self = source`，过程如下：

```text
1. 调用 deepClone(source)，缓存中没有 source。
2. 创建 copy = {}。
3. 缓存 source → copy，此时 copy 还没填充完。
4. 遍历到 self，调用 deepClone(source, 同一份缓存)。
5. 命中缓存，立即返回 copy。
6. 执行 copy.self = copy，完成闭环。
```

如果递归结束后才执行 `map.set`，第 4 步仍然查不到缓存，会不断重复创建对象。**缓存的对象不需要已经复制完；先有容器，才能让循环中的其他对象指向它。**

### 4. 为什么每次递归都要传 `map`

默认参数 `new WeakMap()` 只负责在未传入缓存时创建一份缓存。子调用必须用 `deepClone(obj[key], map)` 共享同一份关系记录。

如果写成 `deepClone(obj[key])`，每层会创建新缓存，既无法识别循环，也无法保留跨分支的共享引用。默认情况下，每次独立调用 `deepClone(source)` 都有自己的缓存，不会复用上次的副本。

### 5. 为什么选 WeakMap，Map 可不可以

循环引用问题由“记录对应关系并复用结果”解决，**不是由弱引用本身解决**。这里换成 `Map` 也能实现相同的复制逻辑。

`WeakMap` 对键不建立强引用，不会仅仅因为缓存仍然存在就阻止原对象被垃圾回收。它不能枚举全部键，但深拷贝只需要 `has`、`get`、`set`，无需枚举。参见 [MDN：WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)。

这份函数的缓存通常随调用结束失去引用，因此使用局部 `Map` 并不等于必然内存泄漏。选择 `WeakMap` 是让对象缓存的生命周期语义更合适；它也不保证垃圾回收立即发生。

---

## 五、扩展：Date、RegExp、Map、Set 怎么处理

### 1. 为什么不能都用 `{}`

这些对象的数据不只是普通可枚举属性。例如 Date 的时间值、Map 的条目、Set 的成员都不能靠 `for...in` 取出来。复制普通字段不会自动复制它们的内部状态。

| 类型 | 创建副本的方式 | 还需要注意什么 |
| :--- | :--- | :--- |
| Date | `new Date(obj.getTime())` | 用毫秒时间值重建，而不是复制格式化字符串 |
| RegExp | `new RegExp(obj.source, obj.flags)` | 如需保留匹配进度，还要复制 `lastIndex` |
| Map | `new Map()` 后遍历条目 | 本笔记选择同时深拷贝键和值，且共享同一份缓存 |
| Set | `new Set()` 后遍历成员 | 成员需要递归复制，且共享同一份缓存 |

### 2. Date：复制时间值

```js
const source = new Date('2026-10-08T00:00:00.000Z')
const copy = new Date(source.getTime())

console.log(copy === source) // false
console.log(copy.getTime() === source.getTime()) // true

copy.setUTCFullYear(2030)
console.log(source.getUTCFullYear()) // 2026：修改副本不影响原日期
```

`getTime()` 返回毫秒时间戳，`new Date(时间戳)` 创建具有相同时间值的新日期。无效日期的时间值是 `NaN`，按此方式复制后仍是无效日期。参见 [MDN：Date.getTime](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime)。

### 3. RegExp：复制规则、标记与匹配进度

```js
const source = /a+/gi
source.lastIndex = 2
const copy = new RegExp(source.source, source.flags)
copy.lastIndex = source.lastIndex

console.log(copy === source) // false
console.log(copy.source) // a+
console.log(copy.flags) // gi
console.log(copy.lastIndex) // 2
console.log(copy.test('xxAAA')) // true
console.log(copy.lastIndex) // 5：g 标记让成功匹配更新下次起点
console.log(source.lastIndex) // 2：两份匹配状态相互独立
```

`source` 是正则表达式正文，`flags` 是标记，`lastIndex` 是带 `g` 或 `y` 标记时用于后续匹配的起点状态。仅重建表达式会把 `lastIndex` 重置为 0。参见 [MDN：RegExp.lastIndex](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastIndex)。

### 4. Map 与 Set：创建容器还不够

```js
const key = { id: 1 }
const value = { score: 80 }
const sourceMap = new Map([[key, value]])
const sourceSet = new Set([value])
const shallowMap = new Map(sourceMap)
const shallowSet = new Set(sourceSet)

console.log(shallowMap === sourceMap) // false
console.log(shallowMap.has(key)) // true：键仍然是原对象
console.log(shallowMap.get(key) === value) // true：值也仍然是原对象
console.log(shallowSet.has(value)) // true：成员仍然是原对象
```

构造器创建了新容器，但对象键、值和成员仍然共享。深拷贝需要逐条递归处理。Map 的键和 Set 的成员在为对象时按对象身份匹配，复制后用原对象查询通常不会命中。参见 [MDN：Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) 与 [MDN：Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)。

Map 的对象键是否要复制，是需要明确的策略。本笔记选择复制键和值，让支持范围内的对象引用都进入副本关系图。如果业务需要继续用原对象作为键查询，就应专门设计保留键的策略，并说明仍存在共享引用。

### 5. 综合练习版

下面的实现支持普通对象（包括无原型对象）、数组、Date、RegExp、Map、Set，并保留循环引用与共享关系。函数按前面的规则返回原引用；其他未支持的对象类型会抛错，避免悄悄变成 `{}`。

统一顺序是：**检查缓存 → 按类型建容器 → 写入缓存 → 递归复制内容**。Date、RegExp 也进入缓存，否则两个属性指向同一个日期或正则时，副本会丢失共享关系。

```js
function deepClone(obj, map = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (map.has(obj)) {
    return map.get(obj)
  }

  let result

  if (obj instanceof Date) {
    result = new Date(obj.getTime())
  } else if (obj instanceof RegExp) {
    result = new RegExp(obj.source, obj.flags)
    result.lastIndex = obj.lastIndex
  } else if (obj instanceof Map) {
    result = new Map()
  } else if (obj instanceof Set) {
    result = new Set()
  } else if (Array.isArray(obj)) {
    result = new Array(obj.length)
  } else {
    const prototype = Object.getPrototypeOf(obj)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('不支持的对象类型')
    }
    result = Object.create(prototype)
  }

  map.set(obj, result)

  if (obj instanceof Map) {
    for (const [key, value] of obj) {
      result.set(deepClone(key, map), deepClone(value, map))
    }
  } else if (obj instanceof Set) {
    for (const value of obj) {
      result.add(deepClone(value, map))
    }
  }

  for (const key of Object.keys(obj)) {
    Object.defineProperty(result, key, {
      value: deepClone(obj[key], map),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }

  return result
}

const shared = { score: 80 }
const date = new Date('2026-10-08T00:00:00.000Z')
const pattern = /a+/gi
pattern.lastIndex = 2
const source = {
  list: [shared],
  date,
  anotherDate: date,
  pattern,
  map: new Map([[shared, shared]]),
  set: new Set([shared]),
}
source.self = source
source.map.set('self', source.map)
source.set.add(source.set)
const copy = deepClone(source)
const clonedKey = [...copy.map.keys()][0]

console.log(copy.self === copy) // true
console.log(copy.list[0] === shared) // false
console.log(copy.date !== date) // true
console.log(copy.date.getTime() === date.getTime()) // true
console.log(copy.date === copy.anotherDate) // true
console.log(copy.pattern !== pattern) // true
console.log(copy.pattern.source === pattern.source) // true
console.log(copy.pattern.flags === pattern.flags) // true
console.log(copy.pattern.lastIndex) // 2
console.log(clonedKey === copy.list[0]) // true：跨容器也共享同一副本
console.log(copy.map.get(clonedKey) === copy.list[0]) // true
console.log(copy.map.has(shared)) // false：原对象键不会匹配新对象键
console.log(copy.map.get('self') === copy.map) // true：Map 自引用
console.log(copy.set.has(copy.list[0])) // true
console.log(copy.set.has(copy.set)) // true：Set 自引用
console.log(copy.set.has(shared)) // false
```

这段代码多了两个小改进，理解用途即可，不需要先背属性描述符的全部规则：

- 数组使用 `new Array(obj.length)`：保留数组长度，再填充实际存在的索引，避免丢掉末尾空位。
- 属性使用 `Object.keys` 与 `Object.defineProperty`：只读取自有可枚举字符串键，并把它们定义为普通数据属性。这样遇到名为 `__proto__` 的自有属性时，不会调用目标对象继承来的 setter 改写原型。这里的描述符是新设的，**没有保留原描述符**。

Map、Set 的条目处理与普通属性处理是两件事。先复制条目，再统一复制可枚举自有字符串属性，也能处理 `date.meta = { ... }` 或 `map.owner = map` 这类自定义字段。

---

## 六、常见写法与推荐实践

### 1. 为什么 JSON 往返不可靠

`JSON.parse(JSON.stringify(obj))` 是“序列化成 JSON，再解析成新值”。JSON 的数据模型比 JavaScript 窄，不能普遍保留原值的类型和对象关系。

| 输入情况 | 默认 JSON 往返的结果 |
| :--- | :--- |
| 普通对象、数组、字符串、布尔值、`null`、有限数字 | 通常可以保留这些 JSON 数据值 |
| 对象属性值为 `undefined`、函数或 Symbol | 对应属性被省略；Symbol 键也不参与序列化 |
| 数组元素为 `undefined`、函数、Symbol 或空位 | 变成 `null` |
| 顶层 `undefined`、函数或 Symbol | `stringify` 返回 `undefined`，再 `parse` 会抛错 |
| `NaN`、`Infinity`、`-Infinity` | 变成 `null`；负零变成零 |
| Date | 有效日期变成 ISO 字符串，无效日期变成 `null` |
| RegExp、Map、Set | 通常变成 `{}`，不保留正则状态、条目或成员 |
| BigInt | 默认抛出 `TypeError` |
| 循环引用 | 默认抛出 `TypeError` |
| 共享引用 | 序列化为重复数据，解析后变成不同对象 |
| 自定义原型、访问器、属性描述符 | 不能原样保留；读取 getter 或调用 `toJSON` 还可能执行代码 |

表格描述未定制 replacer、`toJSON` 等行为的默认场景；对象额外的可枚举字段可能进入 JSON，但内部类型仍然丢失。参见 [MDN：JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)。

```js
const shared = { count: 1 }
const source = {
  left: shared,
  right: shared,
  missing: undefined,
  date: new Date('2026-10-08T00:00:00.000Z'),
  list: [undefined, NaN],
  map: new Map([['count', 1]]),
}
const copy = JSON.parse(JSON.stringify(source))

console.log(Object.hasOwn(copy, 'missing')) // false
console.log(typeof copy.date) // string
console.log(copy.date) // 2026-10-08T00:00:00.000Z
console.log(copy.list[0]) // null
console.log(copy.list[1]) // null
console.log(Object.keys(copy.map).length) // 0：条目丢失
console.log(copy.left === copy.right) // false：共享关系丢失
```

如果输入本来就是 JSON 数据且不依赖共享关系，JSON 往返可以满足有限需求。它不适合作为任意 JavaScript 数据的通用深拷贝。

### 2. 原生 `structuredClone`

在目标运行环境提供该 API、且数据类型符合支持范围时，工程中优先考虑原生 `structuredClone`。它支持循环引用，以及 Date、RegExp、Map、Set 等多种类型。

```js
const shared = { count: 1 }
const source = {
  left: shared,
  right: shared,
  date: new Date('2026-10-08T00:00:00.000Z'),
  map: new Map([['item', shared]]),
  set: new Set([shared]),
  pattern: /a/g,
}
source.self = source
source.pattern.lastIndex = 2
const copy = structuredClone(source)

console.log(copy.self === copy) // true
console.log(copy.left === copy.right) // true
console.log(copy.left === shared) // false
console.log(copy.date instanceof Date) // true
console.log(copy.map.get('item') === copy.left) // true
console.log(copy.set.has(copy.left)) // true
console.log(copy.pattern.lastIndex) // 0：原生算法不保留这个匹配状态

try {
  structuredClone({ fn: () => 1 })
} catch (error) {
  console.log(error.name) // DataCloneError：函数不能被结构化克隆
}
```

它也有边界：函数、Symbol 值、WeakMap、WeakSet、DOM 节点等不支持；自定义原型链、访问器定义和属性描述符不会原样复制，RegExp 的 `lastIndex` 也不会保留。不能因为“原生”就假定所有对象都能复制。参见 [MDN：structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) 与 [结构化克隆算法](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)。

### 3. 怎么选

| 需求 | 合适的方式 |
| :--- | :--- |
| 只需要重新赋值对象的直接属性，允许嵌套对象继续共享 | 展开语法、`Object.assign` 等浅拷贝 |
| 复制符合结构化克隆支持范围的数据 | `structuredClone`，先确认环境与类型支持 |
| 传输、存储 JSON 数据 | JSON 序列化与解析 |
| 手写面试题、理解递归和循环引用 | 本笔记的逐步实现 |
| 保留特殊业务类型或定制 Map 键策略 | 按业务数据模型编写明确的复制逻辑 |

不要为了修改一个字段就默认复制整个复杂对象。先明确哪些数据需要独立、哪些对象应继续共享，再选择做法。

---

## 七、易错点与边界条件

| 错误理解 | 正确理解 |
| :--- | :--- |
| “`copy !== source` 就能证明是深拷贝” | 还要检查嵌套对象、容器条目和引用关系 |
| “WeakMap 会自动消除循环” | 需要主动查缓存、先缓存新容器、复用同一份缓存 |
| “循环引用版什么都能复制” | 它只补上缓存，Date、Map 等仍需要类型分支 |
| “`new Map(oldMap)` / `new Set(oldSet)` 是深拷贝” | 容器是新的，对象键、值和成员仍然共享 |
| “`Object.create(原型)` 就能复制所有实例” | 它不能复制内建内部状态或类的私有字段 |
| “函数直接返回说明函数已经被复制了” | 只是保留原引用，函数自有属性和闭包仍然共享 |
| “深拷贝必须拆散所有共享引用” | 应复制数据，同时保留原关系图中的共享与循环 |

### 1. 属性范围

两版必写代码只复制自有可枚举字符串属性；综合版也采用这个属性范围。Symbol 键与不可枚举属性不会复制。

如果确实需要扩展键范围，可以研究 `Reflect.ownKeys`、`Object.getOwnPropertyDescriptor` 和 `Object.defineProperty`。这属于属性复制策略的进阶内容，不是只把循环换个 API 就能解决：还要决定访问器是否保留、是否递归复制数据属性值、如何处理特殊容器字段。

### 2. getter 与属性描述符

访问 `obj[key]` 可能执行 getter。综合版把读取结果写成普通可写数据属性，不会保留 getter、setter、只读或冻结状态。因此复制过程不保证没有副作用。

### 3. 数组空位与 `__proto__`

两版必写代码用 `[]` 开始，再复制实际存在的索引，不复制不可枚举的 `length`。对于 `new Array(3)` 这样的全空位数组，副本长度会错误地变为 0；末尾空位也可能丢失。综合版用原长度创建数组来处理这个问题。

两版必写代码的 `result[key] = ...` 还可能在键为 `__proto__` 时调用继承的 setter，改变副本原型，而不是创建同名数据属性。它们适用于受控的面试数据；综合版的属性定义方式避开了这个问题。

### 4. 对象类型与递归深度

综合版按当前环境的 `instanceof` 判断内建类型，不处理跨 iframe 等不同 realm 的类型识别，也不承诺保留内建类型子类的原型或私有状态。任意自定义类、Promise、WeakMap、WeakSet、TypedArray、DOM 节点等不在它的支持范围内。

非常深的嵌套结构仍可能导致递归调用栈溢出。缓存避免重复遍历和循环，不会取消递归栈本身；遇到这种规模再考虑显式栈的迭代写法。

### 5. 复杂度怎么回答

设 `V` 为需要新建的不同对象数，`E` 为被遍历的属性与容器条目数；忽略字符串处理成本并按缓存查询通常为常数时间估算，缓存版时间复杂度约为 `O(V + E)`。缓存和输出图规模约为 `O(V + E)`，递归栈额外占用取决于最大遍历深度。

这比笼统说“`O(n)`，空间 `O(n)`”更能说明 `n` 指什么。没有缓存的基础版可能重复复制共享子图，对循环图则无法正常结束。

---

## 八、调试与刷题练习

### 1. 控制台怎么验证

先粘贴想检查的版本及其示例，随后做这几类检查：

1. **引用隔离**：比较 `copy !== source`、嵌套属性是否不同；修改副本后检查原数据。
2. **关系保留**：检查 `copy.self === copy`、共享字段是否仍然相等。
3. **类型保留**：用 `Array.isArray`、`instanceof Date / RegExp / Map / Set` 检查。
4. **状态保留**：检查时间戳、正则正文与标记、`lastIndex`、Map 与 Set 的条目。

在开发者工具里给 `map.set(obj, result)` 和 `map.has(obj)` 所在行打断点，用 `source.self = source` 的示例逐步执行。观察再次进入递归时 `map.has(obj)` 从 `false` 变为 `true`，随后直接返回已经创建的容器。WeakMap 没有键枚举接口，调试时针对已知对象使用 `map.has(source)` 与 `map.get(source)`。

### 2. 按顺序刷这 7 题

| 题目 | 目标 | 验收方式 |
| :--- | :--- | :--- |
| 1. 深拷贝基础版 | 写出递归出口、创建容器、遍历、递归、返回 | `{ user: { name: '小明' } }` 的嵌套对象不共享 |
| 2. 支持数组和对象 | 正确区分容器 | `[{ value: 1 }]` 的副本是数组，元素是新对象 |
| 3. 支持循环引用 | 加 WeakMap，并在递归前缓存 | 自引用不溢出，`copy.self === copy`；共享引用不拆散 |
| 4. 支持 Date | 用时间值重建并缓存 | 类型正确、时间值相等、对象不同；共享日期仍共享 |
| 5. 支持 RegExp | 保留正文、标记及约定的匹配状态 | 类型正确，`source`、`flags`、`lastIndex` 符合预期 |
| 6. 支持 Map | 递归复制键和值 | 对象键和值独立；键和值共享时副本仍共享；支持自引用 |
| 7. 支持 Set | 递归复制成员 | 对象成员独立，`set.add(set)` 的副本仍指向自身 |

第 1、2 题可以用同一份基础模板完成；之后每次只新增一种能力，并解释它补上了什么缺口。练习时先自己写，再回看第三、四、五节。

### 3. 推演题：缓存为什么不能删

在循环引用版里，如果复制完一个对象就 `map.delete(obj)`，为什么下面的数据会出问题？

```js
const shared = { value: 1 }
const source = { left: shared, right: shared }

console.log(source.left === source.right) // true：需要保留的共享关系
```

<details>
<summary>展开答案</summary>

复制 `left` 后删除 `shared` 的缓存，复制 `right` 时就会创建第二个新对象，导致 `copy.left !== copy.right`。缓存记录的是整次复制的对象对应关系，不只是“当前递归路径上有哪些对象”。

</details>

### 4. 边界练习：数组空位与同名属性

粘贴第五节综合版后，再执行这一块；换成第三节基础版时，第一个长度和同名属性检查会不同。

```js
const sparse = new Array(3)
const sparseCopy = deepClone(sparse)
console.log(sparseCopy.length) // 3
console.log(0 in sparseCopy) // false：仍是空位，不是值为 undefined 的元素

const source = JSON.parse('{"__proto__":{"tag":"data"}}')
const copy = deepClone(source)
console.log(Object.hasOwn(copy, '__proto__')) // true：保留同名自有数据属性
console.log(Object.getPrototypeOf(copy) === Object.prototype) // true
console.log(copy.__proto__.tag) // data：读取的是自有属性
```

---

## 九、验收标准：这 4 个问题必须能回答

### 1. 为什么 `typeof null === 'object'`？

早期实现的类型标记导致了这个历史结果，后来为兼容保留。`null` 在语言分类上仍是基本类型，所以判断是否进入对象复制分支时，要先排除 `null`。

### 2. 为什么 `JSON.parse(JSON.stringify(obj))` 不可靠？

它只保留 JSON 能表示的数据模型：部分值被省略或替换，Date 变字符串，Map、Set 等类型丢失，BigInt 和循环引用默认报错，也不保留共享引用、原型和描述符。它可以用于符合 JSON 约束的数据，不能当成通用深拷贝。

### 3. WeakMap 在深拷贝里解决什么问题？

保存原对象到副本的映射。再次遇到同一个原对象就返回已有副本，避免循环递归，也保留共享引用。必须先缓存后递归，所有子调用共用缓存。`Map` 也能做到；`WeakMap` 的额外特点是不会强引用键。

### 4. Date、RegExp、Map、Set 怎么处理？

Date 用时间戳重建；RegExp 用正文与标记重建，需要保留匹配进度时再复制 `lastIndex`；Map 先创建空容器并缓存，再递归复制键和值；Set 先创建空容器并缓存，再递归复制成员。所有类型共用一份缓存以保留引用关系。

---

## 十、记忆清单

> **基本值直接返，按类型建容器；查过缓存再创建，创建立即进缓存；键值成员递归走，同份缓存一路传。**

- 基础版必须会写；循环引用版必须能解释缓存时机。
- 拷贝对象的内容，也要保留支持范围内的共享与循环关系。
- 特殊类型需要特殊创建方式，普通属性循环不能替代内部状态复制。
- 手写实现与 `structuredClone` 都有支持边界，先明确数据模型再选择。

## 参考资料

- [MDN：浅拷贝](https://developer.mozilla.org/en-US/docs/Glossary/Shallow_copy)
- [MDN：深拷贝](https://developer.mozilla.org/en-US/docs/Glossary/Deep_copy)
- [MDN：typeof 与 null 的历史行为](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)
- [MDN：WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
- [MDN：JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [MDN：Date.prototype.getTime](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime)
- [MDN：RegExp.lastIndex](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastIndex)
- [MDN：Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [MDN：Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [MDN：structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
- [MDN：结构化克隆算法的支持范围与限制](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
