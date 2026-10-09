# JavaScript 深拷贝：从对象引用开始，一步步写出 deepClone

> 第一次阅读的目标：看懂对象为什么会共享，能跟着一次递归走进去、再带着结果返回，并理解如何用缓存处理重复遇到的对象。
>
> 建议按第一至第六节学习。第七至第九节是特殊类型、边界与进阶练习，可以以后再读。先理解普通对象和数组，不必一次掌握所有 JavaScript 类型。

**怎么使用这些示例：** 每个 JavaScript 代码块都可以单独运行。不同代码块不共享变量，也不共享函数；本篇需要用到 `deepClone` 的运行示例会自带函数。注释里的结果是本块的预期输出，建议先猜结果，再点“运行”。关系图和步骤说明用于阅读，不需要执行。

---

## 一、先认识对象、属性和引用

### 1. 一个对象里有什么

对象可以把几项相关的数据放在一起。例如，一个用户有姓名和年龄：

```js
const user = { name: '小明', age: 18 }

console.log(user.name) // 小明
console.log(user.age) // 18

user.name = '小红'
console.log(user.name) // 小红
```

- `{ name: '小明', age: 18 }` 创建一个对象。
- `user` 是变量名，通过它可以找到这个对象。
- `name`、`age` 是属性名，也叫键；`'小明'`、`18` 是对应的属性值。
- `user.name` 表示读取这个对象的 `name` 属性；在左边写 `user.name = ...`，就是给这个属性赋值。

`const` 表示不能把变量 `user` 重新赋值为另一个值，但仍然可以修改它所指向对象的属性。

### 2. 两个变量，可以指向同一个对象

先看前两行赋值，再运行下面的输出验证：

```js
const a = { count: 1 }
const b = a

console.log(a === b) // true：a 和 b 指向同一个对象

b.count = 2
console.log(a.count) // 2：通过 a 读到的也是这个对象
```

第一行的 `{ count: 1 }` 创建了一个对象，变量 `a` 指向它。第二行把 `a` 保存的**引用**赋给 `b`，可以把引用理解为“找到这个对象的方式”。这次赋值没有创建新对象，现在通过 `a`、`b` 都能找到原来的那个对象。

下面用箭头表示“指向”。A、B、C 只是为了讲解给对象起的代号，不是需要写进代码的变量名。

<figure class="ref-diagram">
  <div class="ref-heading">两个变量，共用一个对象</div>
  <div class="ref-row">
    <div class="ref-sources"><span class="ref-name">a</span><span class="ref-name">b</span></div>
    <span class="ref-arrow"></span>
    <div class="ref-object"><span class="ref-title">对象 A</span><span class="ref-value">count: 1</span></div>
  </div>
  <figcaption>修改 count 前的关系：a 和 b 都指向右边的同一个对象，赋值没有创建新对象。</figcaption>
</figure>

`b.count = 2` 修改的是对象 A 的属性。随后读取 `a.count`，访问的还是 A，所以得到 `2`。

还要记住：**用 `===` 比较两个对象时，判断的是“是不是同一个对象”。内容一样，不代表是同一个对象。**

比较结果中的 `true` 表示成立，`false` 表示不成立。后面出现的 `!==` 表示“不相等”；用它比较对象，就是判断两边是否为不同对象。

```js
const a = { count: 1 }
const b = { count: 1 }

console.log(a === b) // false：两次对象字面量分别创建了一个对象
console.log(a.count === b.count) // true：两个属性的值都是数字 1
```

以后看到两个变量或属性都指向同一个对象，就可以用这个关系来理解。

### 3. 数字、字符串的赋值有什么不同

`let` 可以声明一个随后重新赋值的变量。下面分别改变 `b`，观察 `a`：

```js
let a = 1
let b = a
b = 2

console.log(a) // 1
console.log(b) // 2
```

数字是基本类型。`b = a` 后，两个变量的值都是 `1`；随后给 `b` 重新赋值，不会改动 `a`。字符串、布尔值等基本类型也不需要像对象那样逐个复制属性。

注意区分“给变量重新赋值”和“修改对象属性”。即使变量指向对象，把 `b` 重新赋值成另一个对象，也不会改变 `a` 指向哪里；前面会互相看到变化，是因为修改了两者共用的对象。

---

## 二、从赋值到浅拷贝，再到手动深拷贝

### 1. 先创建一个独立的新对象

假设我们想修改一份用户资料，同时保留原始资料。直接写 `const copy = source` 会共享对象，因此先尝试手动创建一个新对象：

```js
const source = { name: '小明', age: 18 }
const copy = { name: source.name, age: source.age }

copy.name = '小红'
console.log(source.name) // 小明
console.log(copy.name) // 小红
console.log(copy === source) // false
```

这次两个对象是分别创建的，属性值都是字符串或数字，修改副本的属性不会影响原对象。

### 2. 用循环复制属性，减少重复书写

属性多了以后，逐个写 `name`、`age` 很麻烦。先认识两个工具：

- `Object.keys(source)` 返回属性名组成的数组，例如 `['name', 'age']`。这里取的是对象自己的、可枚举的字符串属性；当前可以把普通对象字面量里写下的这些属性当作例子，精确范围在进阶部分说明。
- `for (const key of ...)` 依次取出数组里的每一项，所以 `key` 会先是 `'name'`，再是 `'age'`。

```js
const source = { name: '小明', age: 18 }
const copy = {}

for (const key of Object.keys(source)) {
  copy[key] = source[key]
}

console.log(copy.name) // 小明
console.log(copy.age) // 18
console.log(copy === source) // false
```

`source[key]` 中的方括号表示“用变量 `key` 的值作为属性名”。当 `key` 是 `'name'` 时，`source[key]` 就是 `source.name`。写成 `source.key` 则会读取一个名字真的叫 `key` 的属性，含义不同。

### 3. 浅拷贝：外层分开，里面的对象可能仍共享

现在增加一层：`profile` 属性的值也是一个对象，这就叫**嵌套对象**。

```js
const source = { profile: { name: '小明' } }
const copy = { ...source }

console.log(copy === source) // false：外层是新对象
console.log(copy.profile === source.profile) // true：内层仍是同一个对象

copy.profile.name = '小红'
console.log(source.profile.name) // 小红
```

`{ ...source }` 中的 `...` 叫展开语法。在这个普通对象例子里，它把 `source` 的属性复制到新对象中，效果类似上一小节的逐项赋值。它不会继续进入 `profile`，再创建一个内层对象。

外层对象已经分开，但复制的 `profile` 属性值是一个引用，于是两个外层对象的 `profile` 都指向原来的内层对象。这就是**浅拷贝**。

<figure class="ref-diagram">
  <div class="ref-heading">浅拷贝：两个外层对象，共用一个内层对象</div>
  <div class="ref-row">
    <div class="ref-sources"><span class="ref-name">source.profile</span><span class="ref-name">copy.profile</span></div>
    <span class="ref-arrow"></span>
    <div class="ref-object"><span class="ref-title">同一个内层对象</span><span class="ref-value">name: '小明'</span></div>
  </div>
  <figcaption>修改前的关系：两个 profile 都指向这里，所以修改其中一个入口看到的数据，另一个入口也能看到变化。</figcaption>
</figure>

### 4. 手动把内层对象也复制一份

```js
const source = { profile: { name: '小明' } }
const copy = {
  profile: { name: source.profile.name },
}

console.log(copy === source) // false
console.log(copy.profile === source.profile) // false

copy.profile.name = '小红'
console.log(copy.profile.name) // 小红
console.log(source.profile.name) // 小明
```

这里外层、内层分别用 `{}` 创建了新对象。对于这份数据，我们已经完成了深拷贝：副本里需要独立的对象都被重新创建，修改副本不会改动原数据。

| 操作 | 外层是否为新对象 | 内层 profile 是否为新对象 |
| :--- | :--- | :--- |
| `const copy = source` | 否 | 否 |
| `const copy = { ...source }` | 是 | 否 |
| 上面的手动深拷贝 | 是 | 是 |

手动写的缺点是必须提前知道每一个属性、每一层结构。如果 `profile` 里还有 `address` 呢？我们需要让函数遇到内层对象时，继续完成同样的复制工作。接下来就会用到递归。

---

## 三、用递归复制普通对象，再加入数组

### 1. 先确定：什么时候继续，什么时候停下

**递归就是函数在执行过程中再次调用自己。** 复制嵌套对象时，外层与内层需要做的事相同：创建新对象，再复制它的属性。

不过，遇到字符串、数字等基本值，就没有必要继续进入属性了，直接返回这个值即可。这条停止继续深入的规则，叫**递归出口**。

`typeof value` 用来查看一个值的类型。这里先记住一个需要特殊处理的情况：`typeof null` 返回 `'object'`，但 `null` 是基本值，不能当成要继续复制属性的对象。

```js
console.log(typeof '小明') // string
console.log(typeof 18) // number
console.log(typeof {}) // object
console.log(typeof []) // object
console.log(typeof null) // object：需要额外排除 null
```

所以函数先判断 `obj === null || typeof obj !== 'object'`。`||` 表示“或者”，满足任意一边就直接返回。这份练习代码也会直接返回函数原引用，因为函数的 `typeof` 是 `'function'`，并没有复制函数本身。

### 2. 只处理普通对象的第一版

本块先使用只含普通对象与基本值的数据，还不处理数组、循环引用或特殊对象。

```js
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  const result = {}

  for (const key of Object.keys(obj)) {
    result[key] = deepClone(obj[key])
  }

  return result
}

const source = { user: { name: '小明' } }
const copy = deepClone(source)

console.log(copy === source) // false
console.log(copy.user === source.user) // false
copy.user.name = '小红'
console.log(source.user.name) // 小明
```

和第二节的循环相比，关键变化是：每次准备把属性值放进副本前，先让 `deepClone` 处理这个值。基本值直接返回，对象则得到一个新的副本。

### 3. 跟着一次调用走进去，再带着结果返回

看上一块的 `deepClone(source)`。每次调用都拥有自己的参数 `obj` 和局部变量 `result`；这些局部变量只是名字相同，不是所有调用共用一个变量。

| 顺序 | 当前调用正在处理什么 | 具体做什么 |
| :--- | :--- | :--- |
| 1 | 外层 `{ user: { name: '小明' } }` | 创建外层新对象 B，准备复制 `user` |
| 2 | 外层读到 `user` | `obj[key]` 是内层对象，调用 `deepClone` 处理它；外层等待返回 |
| 3 | 内层 `{ name: '小明' }` | 创建内层新对象 C，准备复制 `name` |
| 4 | 内层读到 `name` | 调用 `deepClone('小明')`，这次遇到字符串，直接返回 `'小明'` |
| 5 | 回到内层调用 | 把返回值赋给 `C.name`；内层遍历结束，返回 C |
| 6 | 回到外层调用 | 把 C 赋给 `B.user`；外层遍历结束，返回 B |
| 7 | 回到最开始的赋值 | `const copy = ...` 接到 B，所以 `copy` 指向 B |

可以把 `result[key] = deepClone(obj[key])` 按三个动作理解：先读取原属性值，再调用函数得到复制结果，最后把返回值写入当前这一层的新对象。

**创建副本与返回副本是不同的时刻。** 外层创建 B 后，会等待内层返回 C，填好 `B.user`，最后才返回 B。内层调用结束不会直接结束外层调用；外层会从刚才等待的位置继续执行。

### 4. 加入数组：创建相同种类的容器

数组也能装对象，但副本需要继续是数组。`Array.isArray(obj)` 用来判断一个值是不是数组。

因此，把上一版固定创建 `{}` 改成：如果是数组，创建 `[]`；否则创建 `{}`。这里先用普通的 `if...else` 写清楚。

```js
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  let result
  if (Array.isArray(obj)) {
    result = []
  } else {
    result = {}
  }

  for (const key of Object.keys(obj)) {
    result[key] = deepClone(obj[key])
  }

  return result
}

const source = { user: { name: '小明' }, list: [{ score: 80 }] }
const copy = deepClone(source)

console.log(copy === source) // false
console.log(copy.user === source.user) // false
console.log(Array.isArray(copy.list)) // true
console.log(copy.list === source.list) // false
console.log(copy.list[0] === source.list[0]) // false

copy.user.name = '小红'
copy.list[0].score = 100
console.log(source.user.name) // 小明
console.log(source.list[0].score) // 80
```

`list[0]` 表示数组中的第一个元素。对于这里的数组，`Object.keys` 会取出索引字符串 `'0'`，复制逻辑再去处理这个位置的值；它是对象，所以会继续创建一份副本。

后面把容器选择简写为 `const result = Array.isArray(obj) ? [] : {}`。这是三元表达式：问号前的条件成立，就选 `[]`；否则选冒号后的 `{}`。它与这里的 `if...else` 表达相同的选择。

这份基础版用于常规数组、普通对象和基本值。它还没有记录复制过哪些对象，因此遇到对象指回自己，或者两个属性指向同一个对象时，会出现下一节的两个问题。数组空位等特殊情况留到进阶部分讨论。

---

## 四、用 WeakMap 处理循环引用与共享引用

### 1. 先看基础版会遇到的两个问题

#### 问题一：对象的属性引用了对象自己

```js
const source = { name: '小明' }
source.self = source

console.log(source.self === source) // true
console.log(source.self.self === source) // true
```

先逐行理解这里发生了什么：

1. `const source = { name: '小明' }` 创建对象 A，让 `source` 指向 A。
2. `source.self = source` 给 A 添加一个叫 `self` 的属性，这个属性也指向 A。

`self` 是我们自己起的普通属性名，不是特殊语法。第二行没有创建第二个对象，只是让对象的一个属性指回自己：

<figure class="ref-diagram">
  <div class="ref-heading">循环引用：属性指回对象自己</div>
  <div class="ref-row">
    <span class="ref-name">source</span>
    <span class="ref-arrow"></span>
    <div class="ref-object"><span class="ref-title">对象 A</span><span class="ref-value">name: '小明'</span><span class="ref-loop">self: A</span></div>
  </div>
  <figcaption>沿着 self 再走一次，仍然回到对象 A。</figcaption>
</figure>

读取 `source.self`，就是沿着 `self` 的箭头走一次，仍然到达 A。读取 `source.self.self`，是沿着箭头再走一次，仍然到达 A。因此上面两个 `===` 的结果都是 `true`。这种沿着引用又回到自己的情况，叫**循环引用**。

**建立循环引用本身可以正常执行。** `source.self = source` 只赋值一次，不会让程序自动不停地运行。出问题的是：用前面的基础版 `deepClone` 去复制它。

基础版的规则是“遇到对象，就调用自己继续复制它的属性”。调用自己，就是这里所说的**递归**。把执行过程展开：

1. 第一次调用 `deepClone(source)`，准备复制对象 A，并创建一个空的副本。
2. 读到 `name`，它的值是字符串 `'小明'`，直接复制到副本。
3. 读到 `self`，它的值是对象 A，于是调用 `deepClone(source.self)`。因为 `source.self` 就是 A，这相当于再次开始复制 A。
4. 第二次调用也创建一个空副本、复制 `name`，然后又读到 `self`，于是第三次开始复制 A。
5. 每一次调用都在等待下一次调用返回，可下一次又会继续调用下去。最终调用层数过多，出现“调用栈溢出”的错误。

这里始终只有一个原对象 A。**复制函数反复遇到了同一个原对象，却没有记录自己已经开始处理它，因此不断创建新副本、继续递归。**

那么，正确的副本应该是什么样？假设新对象叫 B，变量 `copy` 指向 B：

<figure class="ref-diagram">
  <div class="ref-heading">正确的副本：各自指向自己</div>
  <div class="ref-row">
    <span class="ref-name">source</span><span class="ref-arrow"></span>
    <div class="ref-object"><span class="ref-title">原对象 A</span><span class="ref-loop">self: A</span></div>
  </div>
  <div class="ref-row">
    <span class="ref-name">copy</span><span class="ref-arrow"></span>
    <div class="ref-object"><span class="ref-title">新对象 B</span><span class="ref-loop">self: B</span></div>
  </div>
  <figcaption>A 与 B 是不同对象；副本的 self 指向 B，不指向 A。</figcaption>
</figure>

原来的关系是“自己指向自己”，复制后也应该保留这个关系。因此 `copy.self === copy` 应该是 `true`，而 `copy.self === source` 应该是 `false`。

解决思路是：**第一次遇到 A 时，先创建 B，并记下“A 的副本是 B”。再次遇到 A 时，直接使用 B，不再重新复制 A。** B 的属性可以随后慢慢填充，但这条对应关系必须先记下来。

#### 问题二：两个属性引用了同一个对象

```js
const shared = { count: 1 }
const source = { left: shared, right: shared }

console.log(source.left === source.right) // true

source.left.count = 2
console.log(source.right.count) // 2
```

这里 `shared` 是变量名，`left`、`right` 是属性名，都不是特殊语法。第一行创建了对象 `{ count: 1 }`；第二行又创建了外层对象 `source`，但它的 `left`、`right` 属性都指向第一行创建的那个对象。

下面只画两个属性指向的内部对象，将它叫作 A：

<figure class="ref-diagram">
  <div class="ref-heading">共享引用：三个入口，同一个对象</div>
  <div class="ref-row">
    <div class="ref-sources"><span class="ref-name">shared</span><span class="ref-name">source.left</span><span class="ref-name">source.right</span></div>
    <span class="ref-arrow"></span>
    <div class="ref-object"><span class="ref-title">对象 A</span><span class="ref-value">count: 1</span></div>
  </div>
  <figcaption>修改前的结构：从任何一个入口访问，找到的都是 A。</figcaption>
</figure>

所以 `source.left === source.right` 是 `true`。执行 `source.left.count = 2` 时，修改的是 A 的 `count`；再通过 `source.right.count` 读取的仍然是 A 的 `count`，因此得到 `2`。这叫**共享引用**。

**这个例子没有循环引用。** A 里只有一个数字属性，没有指回 `source` 或 A 自己。基础版能复制完，但复制后的关系发生了变化。

基础版会这样执行：

1. 为外层 `source` 创建副本 `copy`。
2. 复制 `left` 时，遇到 A，创建一个新对象 B，并把 A 的属性复制进去，让 `copy.left` 指向 B。
3. 复制 `right` 时，又遇到 A。但函数没记住刚才已经复制过 A，于是再创建一个新对象 C，让 `copy.right` 指向 C。

结果变成：

<figure class="ref-diagram">
  <div class="ref-heading">基础版的结果：共享关系丢失</div>
  <div class="ref-row">
    <span class="ref-name">copy.left</span><span class="ref-arrow"></span>
    <div class="ref-object"><span class="ref-title">新对象 B</span></div>
  </div>
  <div class="ref-row">
    <span class="ref-name">copy.right</span><span class="ref-arrow"></span>
    <div class="ref-object"><span class="ref-title">新对象 C</span></div>
  </div>
  <figcaption>B 和 C 的属性值相同，但它们是两个对象，修改 B 不会影响 C。</figcaption>
</figure>

你可能会问：深拷贝不是要把对象分开吗，为什么这样也算问题？

这里要区分两层关系：**副本和原对象应当分开；副本内部原本存在的共享关系，应当保留。** 我们希望把原来的两个属性一起带到一份新的对象结构里，而不是让它们从此各用各的对象。

<figure class="ref-diagram">
  <div class="ref-heading">希望得到的结果：副本内部仍然共享</div>
  <div class="ref-row">
    <div class="ref-sources"><span class="ref-name">copy.left</span><span class="ref-name">copy.right</span></div>
    <span class="ref-arrow"></span>
    <div class="ref-object"><span class="ref-title">同一个新对象 B</span></div>
  </div>
  <figcaption>两个属性共用 B；B 与原来的 A 分开，修改 B 不影响 A。</figcaption>
</figure>

区别可以通过修改属性来观察：

- 在原对象中，修改 `source.left.count`，从 `source.right.count` 能读到变化，因为它们共用 A。
- 在正确的副本中，修改 `copy.left.count`，从 `copy.right.count` 也应当能读到变化，因为它们共用 B。
- 同时，原来的 `shared.count` 不应受到这次修改影响，因为 A 和 B 已经分开。
- 基础版却让 `copy.left`、`copy.right` 分别使用 B、C，修改 B 不会影响 C，原来的共享关系就丢失了。

因此，我们希望 `copy.left === copy.right` 是 `true`，而 `copy.left === shared` 是 `false`。这两个条件并不矛盾：共享的是**同一个新对象**。

解决思路和问题一相同：复制 `left` 时记下“A 的副本是 B”，复制 `right` 再次遇到 A 时，就直接使用 B。

#### 两个问题为什么能用同一种办法解决

可以把对应关系想成一本记录簿，保存“**这个原对象，对应哪个新对象**”。每次遇到对象，先查记录；有记录就取出已有副本，没有记录才创建副本并登记。

| 遇到的情况 | 基础版的问题 | 查记录、复用副本的作用 |
| :--- | :--- | :--- |
| 问题一：通过 `self` 又遇到原对象 | 反复递归，最终调用栈溢出 | 使用已经创建的副本，让副本指向自己 |
| 问题二：通过 `right` 又遇到原对象 | 把同一个对象复制成两份，丢失共享关系 | 使用已经创建的副本，让两个属性仍然共享它 |

下面的 `WeakMap` 就用来保存这本“记录簿”。先理解它要记什么，再看代码里的查询、登记和取出操作。

### 2. 实现与验证

`new WeakMap()` 创建一份记录簿，这里把它保存在变量 `map` 中。它充当缓存，保存“**原对象 → 对应的新对象**”。`map.has(obj)` 检查是否已有记录，`map.get(obj)` 取出对应副本，`map.set(obj, result)` 登记对应关系。下面的实现同时处理循环引用与共享引用。

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

  for (const key of Object.keys(obj)) {
    result[key] = deepClone(obj[key], map)
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

1. 调用 `deepClone(source)`，缓存中没有 `source`。
2. 创建一个空副本 B，在函数内部用 `result` 指向它。
3. 记录“`source` 对应 B”，此时 B 还没填充完。
4. 遍历到 `self`，再次调用 `deepClone(source, map)`。
5. 这次查到记录，立即返回 B，不再创建对象或继续遍历。
6. 上一层接到 B，执行相当于 `B.self = B` 的赋值，完成闭环。

如果递归结束后才执行 `map.set`，第 4 步仍然查不到缓存，会不断重复创建对象。**缓存的对象不需要已经复制完；先有容器，才能让循环中的其他对象指向它。**

### 4. 为什么先存空对象，后来取出来却有属性

`map.set(obj, result)` 保存的是指向 `result` 所代表对象的引用。后面给 `result` 添加属性，填充的就是记录簿里指向的那个对象。

可以先运行这个小例子，暂时不加入递归：

```js
const source = { name: '小明' }
const result = {}
const map = new WeakMap()

map.set(source, result)
console.log(map.get(source) === result) // true

result.name = source.name
console.log(map.get(source).name) // 小明
```

存入记录的瞬间没有生成一张空对象的“快照”。记录簿和变量 `result` 指向同一个对象，所以从任一入口都能看到后来填入的属性。

### 5. 为什么每次递归都要传 `map`

默认参数 `new WeakMap()` 只负责在未传入缓存时创建一份缓存。子调用必须用 `deepClone(obj[key], map)` 共享同一份关系记录。

如果写成 `deepClone(obj[key])`，每层会创建新缓存，既无法识别循环，也无法保留跨分支的共享引用。默认情况下，每次独立调用 `deepClone(source)` 都有自己的缓存，不会复用上次的副本。

### 6. 到这里先掌握什么

先记住三件事：查记录、创建后立刻登记、子调用共用同一份记录。能够解释这三步，就已经理解了这个版本的核心。

<details>
<summary>进阶选读：为什么选 WeakMap，Map 可不可以</summary>

循环引用问题由“记录对应关系并复用结果”解决，**不是由弱引用本身解决**。这里换成 `Map` 也能实现相同的复制逻辑。

`WeakMap` 对键不建立强引用，不会仅仅因为缓存仍然存在就阻止原对象被垃圾回收。它不能枚举全部键，但深拷贝只需要 `has`、`get`、`set`，无需枚举。参见 [MDN：WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)。

这份函数的缓存通常随调用结束失去引用，因此使用局部 `Map` 并不等于必然内存泄漏。选择 `WeakMap` 是让对象缓存的生命周期语义更合适；它也不保证垃圾回收立即发生。

</details>

---

## 五、日常使用：先了解原生方法与 JSON 的区别

### 1. structuredClone：用现成的方法完成复制

前面手写函数是为了理解原理。在提供 `structuredClone` 的环境中，如果数据类型在其支持范围内，可以直接使用它。先用已经认识的普通对象、共享引用与循环引用来验证：

```js
const shared = { name: '小明' }
const source = { left: shared, right: shared }
source.self = source

const copy = structuredClone(source)
console.log(copy !== source) // true
console.log(copy.left === copy.right) // true
console.log(copy.left === shared) // false
console.log(copy.self === copy) // true

copy.left.name = '小红'
console.log(copy.right.name) // 小红：副本内部保留共享关系
console.log(shared.name) // 小明：原对象不受影响
```

它不能复制任意值，例如函数不能被结构化克隆。特殊类型的支持范围可在学习完第七节后，阅读本节末尾的扩展说明。

### 2. JSON 的写法为什么有时会丢数据

`JSON.stringify` 把数据转换成 JSON 字符串，`JSON.parse` 再把字符串解析成值。两步组合后可以得到新对象，但 JSON 只能表达一部分 JavaScript 数据。

```js
const source = { name: '小明', missing: undefined }
const jsonText = JSON.stringify(source)
const copy = JSON.parse(jsonText)

console.log(jsonText) // {"name":"小明"}
console.log(Object.keys(copy).join(',')) // name：missing 属性被省略了
console.log(copy === source) // false
```

`join(',')` 把数组里的属性名用逗号连成字符串，方便查看。这个例子说明：创建了新对象，并不保证完整保留了原数据。JSON 遇到循环引用还会报错，也不会保留共享对象之间的关系。

### 3. 第一遍学习时怎么选

| 目的 | 选择 |
| :--- | :--- |
| 新建外层对象，允许内层对象继续共享 | 浅拷贝，例如展开语法 |
| 复制原生方法支持的数据 | 先考虑 `structuredClone`，确认环境与类型支持 |
| 把符合 JSON 约束的数据转换为文本，用于传输或存储 | JSON 序列化与解析 |
| 学习递归、缓存与对象关系 | 继续练习本篇的手写版本 |

<details>
<summary>进阶查阅：JSON 复制的完整限制与例子</summary>

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

</details>

<details>
<summary>进阶查阅：structuredClone 的特殊类型与限制</summary>

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

</details>

---

## 六、第一阶段练习：先预测，再运行，再解释

### 1. 修改浅拷贝的属性，原数据会怎样

先猜下面两个输出。它们看起来都在修改 `copy`，但修改的位置不同。

```js
const source = { name: '小明', profile: { score: 80 } }
const copy = { ...source }
copy.name = '小红'
copy.profile.score = 100

console.log(source.name)
console.log(source.profile.score)
```

<details>
<summary>展开答案与原因</summary>

依次输出 `小明`、`100`。外层对象已经分开，给 `copy.name` 赋值不影响 `source.name`。但 `profile` 指向的内层对象仍然共享，修改其 `score` 会从两个入口都看到变化。

</details>

### 2. 运行一次同时包含共享与循环的复制

本块自带函数，无需先运行第四节。先预测最后四个输出，再运行，最后把 `copy.left.count = 2` 改成其他数字试试。

```js
function deepClone(obj, map = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj
  if (map.has(obj)) return map.get(obj)

  const result = Array.isArray(obj) ? [] : {}
  map.set(obj, result)

  for (const key of Object.keys(obj)) {
    result[key] = deepClone(obj[key], map)
  }
  return result
}

const shared = { count: 1 }
const source = { left: shared, right: shared }
source.self = source
const copy = deepClone(source)
copy.left.count = 2

console.log(copy.right.count)
console.log(shared.count)
console.log(copy.self === copy)
console.log(copy.self === source)
```

<details>
<summary>展开答案与原因</summary>

依次输出 `2`、`1`、`true`、`false`。副本内部的 `left`、`right` 共享同一个新对象，原来的 `shared` 保持独立；副本的 `self` 指回副本自己。

</details>

### 3. 检查自己是否真正理解

不用背整段代码，先尝试用自己的话回答：

1. 为什么 `const copy = source` 不能得到独立副本？
2. 为什么浅拷贝的外层已经分开，修改内层对象却仍然影响原数据？
3. 在第三节例子中，字符串返回给哪一次调用，内层对象又返回给谁？
4. 为什么 `map.set` 要放在递归之前？为什么每次递归必须传入同一份 `map`？
5. 为什么 `copy.left === copy.right` 和 `copy.left !== shared` 可以同时成立？

如果第 3 题讲不顺，就回看第三节的逐步执行表；如果第 4、5 题讲不顺，就回看第四节的关系图。能解释并验证这些问题，就完成了第一阶段，不必立刻背下一节的综合实现。

---

## 七、进阶选读：Date、RegExp、Map、Set

> 本节建立在普通对象、数组、递归和缓存都已理解的基础上。每次只学习一种类型，最后再看综合版。

### 1. 为什么不能都用 `{}`

这些对象的数据不只是普通可枚举属性。例如 Date 的时间值、Map 的条目、Set 的成员都不能靠 `Object.keys` 或 `for...in` 取出来。复制普通字段不会自动复制它们的内部状态。

| 类型 | 创建副本的方式 | 还需要注意什么 |
| :--- | :--- | :--- |
| Date | `new Date(obj.getTime())` | 用毫秒时间值重建，而不是复制格式化字符串 |
| RegExp | `new RegExp(obj.source, obj.flags)` | 如需保留匹配进度，还要复制 `lastIndex` |
| Map | `new Map()` 后遍历条目 | 本笔记选择同时深拷贝键和值，且共享同一份缓存 |
| Set | `new Set()` 后遍历成员 | 成员需要递归复制，且共享同一份缓存 |

### 2. Date：复制时间值

`Date` 用来表示一个时间点。`getTime()` 得到从 1970 年 1 月 1 日 UTC 起算的毫秒数；用同一个数字创建新 Date，可以得到“时间相同、对象不同”的副本。下面只关注这两点，时区与日期格式可以另学。


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

`RegExp` 是用于匹配文本的正则表达式对象。例子中的 `/a+/gi` 表示匹配连续的 a：`i` 表示忽略大小写，`g` 表示全局匹配。`test` 用来检查是否匹配成功；带 `g` 的匹配还会通过 `lastIndex` 记录下一次从哪里继续。

下面把变量命名为 `pattern`，避免把变量名与正则的 `.source` 属性混在一起。`pattern.source` 是规则正文，`pattern.flags` 是标记。


```js
const pattern = /a+/gi
pattern.lastIndex = 2
const copy = new RegExp(pattern.source, pattern.flags)
copy.lastIndex = pattern.lastIndex

console.log(copy === pattern) // false
console.log(copy.source) // a+
console.log(copy.flags) // gi
console.log(copy.lastIndex) // 2
console.log(copy.test('xxAAA')) // true
console.log(copy.lastIndex) // 5：g 标记让成功匹配更新下次起点
console.log(pattern.lastIndex) // 2：两份匹配状态相互独立
```

`source` 是正则表达式正文，`flags` 是标记，`lastIndex` 是带 `g` 或 `y` 标记时用于后续匹配的起点状态。仅重建表达式会把 `lastIndex` 重置为 0。参见 [MDN：RegExp.lastIndex](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastIndex)。

### 4. Map 与 Set：先认识用法，再看复制

Map 存放一组“键 → 值”，可以用 `set` 写入、`get` 读取、`has` 判断键是否存在；它的键也可以是对象。Set 保存不重复的成员，用 `add` 添加、`has` 判断是否存在。

```js
const scores = new Map()
scores.set('小明', 80)
console.log(scores.get('小明')) // 80
console.log(scores.has('小明')) // true

const names = new Set()
names.add('小明')
names.add('小明')
console.log(names.size) // 1：相同成员不会重复添加
console.log(names.has('小明')) // true
```

`new Map([[key, value]])` 是用一组键值对初始化 Map；`new Set([value])` 是用一个数组里的值初始化 Set。下面把成员换成对象，观察只创建新容器是否足够：


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

这段完整示例可以直接运行。阅读时先找各类型的“创建空副本”分支，再找缓存登记，最后看如何填充条目与属性。`instanceof` 用来判断对象是否属于对应类型；`for...of` 在 Map 中依次取出键值对，在 Set 中依次取出成员。

<details>
<summary>展开完整实现、验证示例与属性处理说明</summary>

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

</details>

---

## 八、进阶查阅：属性范围与实现边界

> 遇到特殊数据或回顾面试细节时再查阅。本节不要求第一遍就掌握。

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

第三、四节的基础实现只复制自有可枚举字符串属性；综合版也采用这个属性范围。Symbol 键与不可枚举属性不会复制。

如果确实需要扩展键范围，可以研究 `Reflect.ownKeys`、`Object.getOwnPropertyDescriptor` 和 `Object.defineProperty`。这属于属性复制策略的进阶内容，不是只把循环换个 API 就能解决：还要决定访问器是否保留、是否递归复制数据属性值、如何处理特殊容器字段。

### 2. getter 与属性描述符

访问 `obj[key]` 可能执行 getter。综合版把读取结果写成普通可写数据属性，不会保留 getter、setter、只读或冻结状态。因此复制过程不保证没有副作用。

### 3. 数组空位与 `__proto__`

第三、四节的基础实现用 `[]` 开始，再复制实际存在的索引，不复制不可枚举的 `length`。对于 `new Array(3)` 这样的全空位数组，副本长度会错误地变为 0；末尾空位也可能丢失。综合版用原长度创建数组来处理这个问题。

第三、四节的基础实现的 `result[key] = ...` 还可能在键为 `__proto__` 时调用继承的 setter，改变副本原型，而不是创建同名数据属性。它们适用于受控的面试数据；综合版的属性定义方式避开了这个问题。

### 4. 对象类型与递归深度

综合版按当前环境的 `instanceof` 判断内建类型，不处理跨 iframe 等不同 realm 的类型识别，也不承诺保留内建类型子类的原型或私有状态。任意自定义类、Promise、WeakMap、WeakSet、TypedArray、DOM 节点等不在它的支持范围内。

非常深的嵌套结构仍可能导致递归调用栈溢出。缓存避免重复遍历和循环，不会取消递归栈本身；遇到这种规模再考虑显式栈的迭代写法。

### 5. 复杂度怎么回答

设 `V` 为需要新建的不同对象数，`E` 为被遍历的属性与容器条目数；忽略字符串处理成本并按缓存查询通常为常数时间估算，缓存版时间复杂度约为 `O(V + E)`。缓存和输出图规模约为 `O(V + E)`，递归栈额外占用取决于最大遍历深度。

这比笼统说“`O(n)`，空间 `O(n)`”更能说明 `n` 指什么。没有缓存的基础版可能重复复制共享子图，对循环图则无法正常结束。

### 6. 阅读其他实现时：hasOwnProperty 与原型

对象可能有同名自有属性，也可能完全没有 `Object.prototype`。直接调用对象自己的方法并不可靠。

```js
const source = Object.create(null)
source.hasOwnProperty = '同名数据'
source.name = '小明'

console.log(typeof source.hasOwnProperty) // string：不是可调用的方法
console.log(Object.prototype.hasOwnProperty.call(source, 'name')) // true
console.log(Object.hasOwn(source, 'name')) // true：现代 API，含义相同
```

阅读旧实现时，可能看到 `for...in` 搭配 `Object.prototype.hasOwnProperty.call` 来排除继承属性；现代环境也可以使用 `Object.hasOwn(obj, key)`。本文基础实现直接使用 `Object.keys` 获取自有可枚举字符串键。基础版能读取无原型对象的字段，但复制结果是 `{}`，不会保留它的空原型。

### 7. 补充：null 的类型判断

这是 JavaScript 的历史遗留行为。早期实现用类型标记表示值，对象的标记为 0，`null` 的表示也被识别为这个标记。该结果为了兼容已有代码保留至今。**语言分类上，`null` 仍然是基本类型，不是对象。** 参见 [MDN：typeof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)。

面试回答不用深入引擎细节，记住“历史兼容行为 + `null` 是基本类型 + 判断对象时单独排除 `null`”即可。

---

## 九、进阶练习：调试与边界验证

### 1. 控制台怎么验证

本页每个代码块独立运行。直接在包含函数和示例的同一个编辑区修改、运行，再做这些检查；前一块里的变量不会自动带到后一块。

1. **引用隔离**：比较 `copy !== source`、嵌套属性是否不同；修改副本后检查原数据。
2. **关系保留**：检查 `copy.self === copy`、共享字段是否仍然相等。
3. **类型保留**：用 `Array.isArray`、`instanceof Date / RegExp / Map / Set` 检查。
4. **状态保留**：检查时间戳、正则正文与标记、`lastIndex`、Map 与 Set 的条目。

如果要单步调试，可以把包含函数与示例的完整代码放进浏览器开发者工具的 Snippets（代码片段）中，再给 `map.set(obj, result)` 和 `map.has(obj)` 所在行打断点，用 `source.self = source` 的示例逐步执行。观察再次进入递归时 `map.has(obj)` 从 `false` 变为 `true`，随后直接返回已经创建的容器。WeakMap 没有键枚举接口，调试时针对已知对象使用 `map.has(source)` 与 `map.get(source)`。

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

第 1、2 题可以用同一份基础模板完成；之后每次只新增一种能力，并解释它补上了什么缺口。练习时先自己写，再回看第三、四、七节。

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

本块自带一个只处理普通对象与数组的版本，用来单独验证第七节综合版的两项改进：保留数组长度、把特殊名字作为普通属性定义。无需先运行其他代码块。

```js
function deepClone(obj, map = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj
  if (map.has(obj)) return map.get(obj)

  const result = Array.isArray(obj)
    ? new Array(obj.length)
    : Object.create(Object.getPrototypeOf(obj))
  map.set(obj, result)

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

## 十、回顾：把一次复制过程讲清楚

第一阶段可以用下面的顺序复述算法：

1. 遇到基本值，直接返回。
2. 遇到对象，先查有没有已有副本；有就返回它。
3. 没有副本，就创建对应的空对象或数组，并立刻记录对应关系。
4. 逐个处理属性值，把递归返回的结果放进当前副本。
5. 属性处理完毕，返回当前副本，让上一层继续执行。

先能预测输出，再能解释过程，最后尝试不看答案写出代码。进阶时才继续处理特殊类型、属性规则和环境差异；手写实现与原生方法都要结合数据范围使用。

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
