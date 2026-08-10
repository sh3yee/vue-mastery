# JavaScript 原型、原型链与继承学习笔记

> 面向初学者的系统笔记：从“对象如何共享方法”开始，逐步理解 `[[Prototype]]`、`prototype`、`constructor`、`new`、原生原型和继承方式。
>
> 本笔记根据 JavaScript.info、MDN 以及冴羽 JavaScript 深入系列相关资料整理。示例以现代 JavaScript 写法为主；`__proto__` 仅用于帮助阅读旧代码。

---

## 一、先记住一张总图

```text
实例对象 instance
  │  [[Prototype]]
  ▼
构造函数的 prototype 对象
  │  [[Prototype]]
  ▼
Object.prototype
  │  [[Prototype]]
  ▼
null
```

例如：

```js
function Person(name) {
  this.name = name
}

Person.prototype.sayName = function () {
  return this.name
}

const person = new Person('小明')
```

此时可以这样理解：

```text
person
  └── [[Prototype]] ──> Person.prototype
                              └── [[Prototype]] ──> Object.prototype
                                                          └── [[Prototype]] ──> null
```

关键关系：

```js
Object.getPrototypeOf(person) === Person.prototype // true
Person.prototype.constructor === Person // true
Object.getPrototypeOf(Person.prototype) === Object.prototype // true
Object.getPrototypeOf(Object.prototype) === null // true
```

---

# 二、对象为什么能访问没有定义在自己身上的属性？

## 1. 对象是动态的属性集合

JavaScript 对象可以看作一组属性的集合：

```js
const rabbit = {
  jumps: true,
}

console.log(rabbit.jumps) // true
console.log(rabbit.eats) // undefined
```

`jumps` 是 `rabbit` 自己拥有的属性，通常称为 **自有属性（own property）**。

但是，JavaScript 对象还有一个隐藏的内部链接：

```text
[[Prototype]]
```

它指向另一个对象，或者指向 `null`。被指向的对象称为当前对象的**原型（prototype）**。

## 2. 原型继承的基本例子

```js
const animal = {
  eats: true,
  walk() {
    return 'Animal walks'
  },
}

const rabbit = {
  jumps: true,
}

Object.setPrototypeOf(rabbit, animal)

console.log(rabbit.jumps) // true：rabbit 自己有
console.log(rabbit.eats) // true：从 animal 找到
console.log(rabbit.walk()) // Animal walks：从 animal 找到
```

读取 `rabbit.eats` 时，JavaScript 会按照以下顺序查找：

```text
1. rabbit 自己有没有 eats？没有
2. rabbit 的 [[Prototype]]，也就是 animal，有没有 eats？有
3. 返回 animal.eats
```

如果整条原型链都找不到，结果就是 `undefined`。

```js
console.log(rabbit.notFound) // undefined
```

原型链不能形成环，并且每个对象最多只能有一个直接原型：

```js
Object.setPrototypeOf(animal, rabbit) // TypeError：会形成循环
```

---

# 三、`[[Prototype]]`、`__proto__` 和 `prototype` 的区别

这是原型学习中最重要的一组概念。

## 1. `[[Prototype]]`：对象内部的原型链接

`[[Prototype]]` 是规范中的内部槽位，不是普通 JavaScript 属性。它表示：

> 当前对象的原型是谁？

推荐使用以下标准 API 读取和设置：

```js
const parent = { kind: 'parent' }
const child = Object.create(parent)

console.log(Object.getPrototypeOf(child) === parent) // true

Object.setPrototypeOf(child, null)
console.log(Object.getPrototypeOf(child)) // null
```

## 2. `__proto__`：访问器，不等于 `[[Prototype]]`

很多旧代码会这样写：

```js
child.__proto__ = parent
```

它实际上是通过 `Object.prototype` 上历史遗留的 getter/setter 访问内部的 `[[Prototype]]`，所以：

```js
child.__proto__ === Object.getPrototypeOf(child)
```

现代代码优先使用：

```js
Object.getPrototypeOf(child)
Object.setPrototypeOf(child, parent)
```

对象字面量中的特殊写法是标准语法，可以在创建时设置原型：

```js
const child = {
  name: 'child',
  __proto__: parent,
}
```

注意它和后续的 `child.__proto__ = parent` 不是同一种语法。初学阶段只需要记住：**创建对象时可以使用字面量的 `__proto__`，修改已有对象时优先使用 `Object.setPrototypeOf()`。**

## 3. `F.prototype`：函数的普通属性

`prototype` 是函数对象上的一个普通属性，主要在函数被 `new` 调用时发挥特殊作用：

```js
function Person() {}

const person = new Person()

Object.getPrototypeOf(person) === Person.prototype // true
```

因此，下面两句话方向相反：

```text
person 的 [[Prototype]] 指向 Person.prototype
Person.prototype 是一个普通对象属性，被 new 用来设置实例原型
```

这两句话描述的是同一条关系的两端：

```text
Person 这个函数对象
  └── prototype 属性 ──> Person.prototype

person 这个实例对象
  └── [[Prototype]] ──> Person.prototype
```

### 第一句是什么意思？

```text
person 的 [[Prototype]] 指向 Person.prototype
```

意思是：`person` 自己没有找到某个属性时，JavaScript 会去 `Person.prototype` 中继续查找。

```js
function Person(name) {
  this.name = name
}

Person.prototype.sayName = function () {
  return this.name
}

const person = new Person('小明')

console.log(Object.getPrototypeOf(person) === Person.prototype) // true
console.log(Object.hasOwn(person, 'sayName')) // false
console.log(Object.hasOwn(Person.prototype, 'sayName')) // true
console.log(person.sayName()) // 小明
```

调用 `person.sayName()` 时，查找过程可以理解为：

```text
1. person 自己有没有 sayName？没有
2. 沿着 person 的 [[Prototype]] 找到 Person.prototype
3. Person.prototype 上有 sayName，取出并调用
4. 调用时的 this 仍然是 person，而不是 Person.prototype
```

### 第二句是什么意思？

```text
Person.prototype 是一个普通对象属性，被 new 用来设置实例原型
```

`Person` 是一个函数，而函数本身也是对象，所以它可以拥有普通属性。`prototype` 就是 `Person` 身上的一个属性，它的值通常是一个对象：

```js
function Person() {}

console.log(typeof Person.prototype) // object
console.log(Person.prototype.constructor === Person) // true
```

执行下面的代码时：

```js
const person = new Person()
```

`new` 会读取当时的 `Person.prototype`，并把它设置为新实例 `person` 的 `[[Prototype]]`。为了帮助理解，可以近似写成：

```js
const person = Object.create(Person.prototype)
Person.call(person)
```

所以，`Person.prototype` 是构造函数上的属性，而 `person` 的 `[[Prototype]]` 是实例内部的原型链接；它们不是同一个概念，但在执行 `new Person()` 时会建立连接：

```js
Object.getPrototypeOf(person) === Person.prototype // true
```

### 不要把 `Person.prototype` 和 `Person` 的原型混淆

```js
Person.prototype
```

表示 `Person` 函数的 `prototype` 属性；而：

```js
Object.getPrototypeOf(Person)
```

表示 `Person` 这个函数对象自己的 `[[Prototype]]`。通常有：

```js
Object.getPrototypeOf(Person) === Function.prototype // true
```

完整关系可以画成：

```text
Person 这个函数对象
  └── [[Prototype]] ──> Function.prototype

person 这个实例对象
  └── [[Prototype]] ──> Person.prototype
                              └── [[Prototype]] ──> Object.prototype
                                                          └── [[Prototype]] ──> null
```

不要把下面两者混为一谈：

```js
Object.getPrototypeOf(Person) // Person 这个函数对象的原型，通常是 Function.prototype
Person.prototype // Person 作为构造函数时，实例使用的原型对象
```

箭头函数没有自己的 `prototype` 属性，也不能使用 `new`：

```js
const add = () => 1
console.log(add.prototype) // undefined
// new add() // TypeError
```

---

# 四、属性查找、覆盖与写入规则

## 1. 自有属性会覆盖原型属性

```js
const animal = {
  name: 'animal',
}

const rabbit = Object.create(animal)

console.log(rabbit.name) // animal

rabbit.name = 'rabbit'
console.log(rabbit.name) // rabbit
console.log(animal.name) // animal
```

这叫**属性遮蔽（property shadowing）**：子对象拥有同名属性后，会优先使用自己的属性。

## 2. 写入通常发生在当前对象上

原型主要参与读取，不会因为给子对象赋值就修改原型：

```js
const animal = {
  sleep() {
    this.isSleeping = true
  },
}

const rabbit = Object.create(animal)
rabbit.sleep()

console.log(rabbit.isSleeping) // true
console.log(Object.hasOwn(rabbit, 'isSleeping')) // true
console.log(animal.isSleeping) // undefined
```

即使 `sleep` 方法来自 `animal`，调用 `rabbit.sleep()` 时，`this` 仍然是 `rabbit`。原型只负责“找到方法”，不负责改变 `this`。

## 3. setter 是写入规则的例外

如果原型上是 setter，赋值时会触发 setter：

```js
const user = {
  firstName: '小',
  lastName: '明',
  set fullName(value) {
    ;[this.firstName, this.lastName] = value.split(' ')
  },
}

const admin = Object.create(user)
admin.fullName = '大 明'

console.log(admin.firstName) // 大
console.log(user.firstName) // 小
```

setter 内部的 `this` 仍然是 `admin`。

---

# 五、`this` 与原型的关系

可以把 `obj.method()` 拆成两步：

```text
1. 沿着 obj 的原型链寻找 method
2. 找到后，以 obj 作为 this 调用它
```

```js
const parent = {
  value: 2,
  getValue() {
    return this.value
  },
}

const child = Object.create(parent)

console.log(child.getValue()) // 2，this 是 child
child.value = 10
console.log(child.getValue()) // 10，this 仍然是 child
```

所以“方法定义在哪里”和“方法调用时 `this` 是谁”是两个问题：

```text
方法可以定义在 prototype 上
但 this 通常由调用方式决定
```

这也解释了为什么原型上的方法可以被所有实例共享，同时又能操作各自的数据。

---

# 六、构造函数、`prototype` 与 `constructor`

## 1. 构造函数是什么？

普通函数使用 `new` 调用时，就承担了构造函数的角色：

```js
function Person(name) {
  this.name = name
}

const person = new Person('小明')
console.log(person.name) // 小明
```

函数本身并不天然就是“类”，只是 `new` 调用方式让它成为构造器。

## 2. 函数默认的 `prototype`

普通函数默认拥有一个 `prototype` 对象，这个对象通常有一个 `constructor` 属性指回函数本身：

```js
function Person() {}

console.log(Person.prototype.constructor === Person) // true
```

因此：

```js
const person = new Person()

// person 自己通常没有 constructor
// 读取时会沿着原型链找到 Person.prototype.constructor
console.log(person.constructor === Person) // true
```

但 `constructor` 不是引擎永远保证正确的“类型标签”，它只是原型对象上的一个普通属性。

## 3. 不要整体覆盖 prototype，除非你知道后果

```js
function Person() {}

Person.prototype = {
  sayName() {},
}

console.log(Person.prototype.constructor === Person) // false
```

因为新对象字面量没有自动拥有 `constructor: Person`。如果必须整体替换，应手动补回：

```js
Person.prototype = {
  constructor: Person,
  sayName() {},
}
```

更推荐直接修改原来的 prototype 对象：

```js
Person.prototype.sayName = function () {}
```

这样可以保留已有实例与原型对象的连接。

---

# 七、`new` 到底做了什么？

执行：

```js
const person = new Person('小明')
```

可以按四步理解：

```text
1. 创建一个空对象 obj
2. 把 obj 的 [[Prototype]] 设置为 Person.prototype
3. 使用 obj 作为 this，执行 Person('小明')
4. 如果构造函数返回对象，就返回该对象；否则返回 obj
```

近似模拟：

```js
function myNew(Constructor, ...args) {
  const instance = Object.create(Constructor.prototype)
  const result = Constructor.apply(instance, args)

  if (result !== null && (typeof result === 'object' || typeof result === 'function')) {
    return result
  }

  return instance
}
```

> 这只是帮助理解 `new` 的核心机制，不是完整替代品。真实 `new` 还涉及构造器合法性、类构造函数、代理等规范细节。

## 构造函数的返回值

返回基本类型时，基本类型会被忽略：

```js
function Person() {
  this.name = '小明'
  return 'ignored'
}

console.log(new Person().name) // 小明
```

返回对象时，对象会替代新实例：

```js
function Person() {
  this.name = '小明'
  return { name: '小红' }
}

const person = new Person()
console.log(person.name) // 小红
console.log(person instanceof Person) // false
```

---

# 八、原型链的完整示例

```js
function Person(name) {
  this.name = name
}

Person.prototype.sayName = function () {
  return this.name
}

const person = new Person('小明')
```

属性查找：

```text
person.name
  person 自己找到 name

person.sayName
  person 没有 sayName
  Person.prototype 找到 sayName

person.toString
  person 没有
  Person.prototype 没有
  Object.prototype 找到

person.notFound
  逐级找不到
  返回 undefined
```

验证原型链：

```js
console.log(Object.getPrototypeOf(person) === Person.prototype) // true
console.log(Object.getPrototypeOf(Person.prototype) === Object.prototype) // true
console.log(Object.getPrototypeOf(Object.prototype) === null) // true

console.log(person instanceof Person) // true
console.log(person instanceof Object) // true
```

`instanceof` 的核心不是检查构造函数代码，而是检查：

> `Constructor.prototype` 是否出现在对象的原型链上。

---

# 九、原生对象的原型

JavaScript 内置对象也使用原型保存共享方法。

## 1. 普通对象

```js
const object = {}

console.log(Object.getPrototypeOf(object) === Object.prototype) // true
console.log(object.toString === Object.prototype.toString) // true
```

`toString` 不在 `object` 自己身上，而是在 `Object.prototype` 上。

## 2. 数组

```js
const list = [1, 2, 3]

console.log(Object.getPrototypeOf(list) === Array.prototype) // true
console.log(Object.getPrototypeOf(Array.prototype) === Object.prototype) // true
```

`map`、`filter`、`push` 等方法都来自 `Array.prototype`。

```text
list → Array.prototype → Object.prototype → null
```

## 3. 函数

函数也是对象，因此函数也有原型链：

```js
function fn() {}

console.log(Object.getPrototypeOf(fn) === Function.prototype) // true
console.log(Object.getPrototypeOf(Function.prototype) === Object.prototype) // true
```

`call`、`apply`、`bind` 等方法来自 `Function.prototype`。

## 4. 基本类型的包装对象

字符串、数字和布尔值本身不是对象，但访问属性时 JavaScript 会临时使用包装对象：

```js
console.log('hello'.toUpperCase()) // HELLO
console.log((123.456).toFixed(2)) // 123.46
console.log(true.toString()) // true
```

它们对应的原型是：

```js
String.prototype
Number.prototype
Boolean.prototype
```

`null` 和 `undefined` 没有包装对象，因此不能直接访问属性：

```js
// null.toString() // TypeError
// undefined.toString() // TypeError
```

## 5. 不要随意修改原生 prototype

下面的代码虽然能工作，但通常不应该这样做：

```js
String.prototype.shout = function () {
  return this.toUpperCase()
}
```

风险包括：

- 污染全局环境；
- 与其他库的方法重名并互相覆盖；
- 未来标准新增同名方法时发生冲突；
- 让 `for...in` 等操作出现意外属性。

唯一比较合理的场景是 **polyfill**：目标环境还没有某个已经进入标准的方法时，进行兼容实现，并且要先判断是否存在。

## 6. 借用原型方法

很多内置方法只要求对象具有对应的数据结构，并不要求对象必须是真正的数组：

```js
const arrayLike = {
  0: 'Hello',
  1: 'world',
  length: 2,
}

const result = Array.prototype.join.call(arrayLike, ', ')
console.log(result) // Hello, world
```

这比强行修改对象的原型更灵活。

---

# 十、对象创建方式与优缺点

## 1. 对象字面量

```js
const person = {
  name: '小明',
  sayName() {
    return this.name
  },
}
```

优点：简单、直观，适合创建少量对象。

缺点：如果大量创建同结构对象，方法可能被重复创建。

## 2. 工厂模式

```js
function createPerson(name) {
  return {
    name,
    sayName() {
      return this.name
    },
  }
}
```

优点：封装创建过程，可以传入参数。

缺点：每个对象都会创建一份 `sayName`；通常不能通过 `instanceof` 识别为特定类型。

## 3. 构造函数模式

```js
function Person(name) {
  this.name = name
  this.sayName = function () {
    return this.name
  }
}
```

优点：可以使用 `new`，实例能通过 `instanceof Person` 识别。

缺点：方法写在构造函数中，每次创建实例都会生成新的函数。

## 4. 原型模式

```js
function Person(name) {
  this.name = name
}

Person.prototype.sayName = function () {
  return this.name
}
```

优点：方法被所有实例共享，不会重复创建。

缺点：如果把可变引用类型直接放到 prototype 上，会被所有实例共享：

```js
Person.prototype.hobbies = [] // 容易造成共享状态问题
```

## 5. 组合模式：最常用的传统写法

```js
function Person(name) {
  // 每个实例独有的数据放在构造函数中
  this.name = name
  this.hobbies = []
}

// 所有实例共享的方法放在 prototype 中
Person.prototype.sayName = function () {
  return this.name
}
```

记忆方法：

```text
实例数据：构造函数中初始化
共享行为：prototype 上定义
```

## 6. `Object.create()`

```js
const animal = {
  eats: true,
}

const rabbit = Object.create(animal)
console.log(rabbit.eats) // true
```

`Object.create(animal)` 同时完成两件事：

```text
1. 创建一个新的空对象 rabbit
2. 将 rabbit 的 [[Prototype]] 设置为 animal
```

因此，它的第一个参数会直接成为新对象的 `[[Prototype]]`：

```js
console.log(Object.getPrototypeOf(rabbit) === animal) // true
```

它可以近似理解为下面两步：

```js
const rabbit = {}
Object.setPrototypeOf(rabbit, animal)
```

两种写法都能建立相同的原型关系，但使用场景不同：

```text
Object.create(parent)
  → 创建新对象时直接设置原型

Object.setPrototypeOf(object, parent)
  → 修改一个已经存在的对象的原型
```

如果创建对象时已经知道它的原型，优先使用 `Object.create()`。频繁修改已有对象的原型可能破坏 JavaScript 引擎的优化。

还要注意，`Object.create(animal)` 不会复制 `animal` 的属性。此时 `rabbit` 自己仍然没有 `eats`，只是可以沿着原型链访问它：

```js
console.log(rabbit.eats) // true：从 animal 中找到
console.log(Object.hasOwn(rabbit, 'eats')) // false
console.log(Object.keys(rabbit)) // []

rabbit.eats = false

console.log(rabbit.eats) // false：rabbit 的自有属性
console.log(animal.eats) // true：原型对象没有被修改
console.log(Object.hasOwn(rabbit, 'eats')) // true
```

```js
const dictionary = Object.create(null)
dictionary.apple = '苹果'

console.log(Object.getPrototypeOf(dictionary)) // null
console.log(dictionary.toString) // undefined
```

`Object.create(null)` 适合创建纯粹的字典对象，但它没有 `hasOwnProperty`、`toString` 等常用方法。

## 7. 类语法

```js
class Person {
  constructor(name) {
    this.name = name
  }

  sayName() {
    return this.name
  }
}
```

类方法仍然放在 `Person.prototype` 上：

```js
const person = new Person('小明')
console.log(Object.hasOwn(person, 'sayName')) // false
console.log(Object.hasOwn(Person.prototype, 'sayName')) // true
```

类不是全新的继承模型，而是对构造函数和原型机制的更清晰封装。类的优势是可读性、`extends`、私有字段等现代能力。

---

# 十一、继承方式与优缺点

## 1. 原型链继承

```js
function Parent() {
  this.colors = ['red', 'blue']
}

Parent.prototype.getColors = function () {
  return this.colors
}

function Child() {}

Child.prototype = new Parent()
```

问题：

- 父构造函数中的引用类型属性会被所有子实例共享；
- 创建子实例时无法方便地给父构造函数传参；
- 重写 `Child.prototype` 后需要手动修复 `constructor`。

## 2. 借用构造函数继承

```js
function Parent(name) {
  this.name = name
  this.colors = []
}

function Child(name) {
  Parent.call(this, name)
}
```

优点：

- 每个子实例都有独立的实例属性；
- 可以向父构造函数传参。

缺点：

- 父类方法如果定义在构造函数中，仍会被重复创建；
- 子实例没有连接到 `Parent.prototype`，无法自然继承父类原型方法。

## 3. 组合继承

组合继承把上面两种方式结合起来：

```js
function Parent(name) {
  this.name = name
  this.colors = []
}

Parent.prototype.getName = function () {
  return this.name
}

function Child(name, age) {
  Parent.call(this, name)
  this.age = age
}

Child.prototype = new Parent()
Child.prototype.constructor = Child
```

优点：兼顾了实例属性独立和原型方法共享。

缺点：父构造函数会执行两次：

```text
Child.prototype = new Parent()  // 第一次
new Child() 内部的 Parent.call() // 第二次
```

## 4. 原型式继承

```js
const person = {
  name: '小明',
  friends: ['小红'],
}

const person1 = Object.create(person)
const person2 = Object.create(person)

person1.friends.push('小刚')
console.log(person2.friends) // ['小红', '小刚']
```

它适合“基于一个已有对象创建另一个对象”，但原型中的引用类型仍然会共享。

## 5. 寄生式继承

寄生式继承是在原型式继承的基础上，为新对象增加额外能力：

```js
function createPerson(source) {
  const person = Object.create(source)

  person.sayHello = function () {
    return `你好，我是 ${this.name}`
  }

  return person
}
```

缺点是每次调用都会创建新的方法函数。

## 6. 寄生组合式继承

传统写法可以用 `Object.create()` 直接表达：

```js
function Parent(name) {
  this.name = name
  this.colors = []
}

Parent.prototype.getName = function () {
  return this.name
}

function Child(name, age) {
  Parent.call(this, name)
  this.age = age
}

Child.prototype = Object.create(Parent.prototype)
Child.prototype.constructor = Child
```

这种方式：

- 只调用一次父构造函数；
- 子实例独立拥有父构造函数中的数据；
- 子类原型通过链路访问父类原型方法；
- `instanceof` 和 `isPrototypeOf` 仍然正常工作。

在现代代码中，通常直接使用类：

```js
class Parent {
  constructor(name) {
    this.name = name
    this.colors = []
  }

  getName() {
    return this.name
  }
}

class Child extends Parent {
  constructor(name, age) {
    super(name)
    this.age = age
  }
}
```

类的底层仍然是原型链：

```text
child 实例
  → Child.prototype
  → Parent.prototype
  → Object.prototype
  → null
```

---

# 十二、`for...in` 与自有属性

`for...in` 会遍历对象自身以及原型链上**可枚举**的属性：

```js
const animal = {
  eats: true,
}

const rabbit = Object.create(animal)
rabbit.jumps = true

for (const key in rabbit) {
  console.log(key) // jumps、eats
}
```

而以下方法只读取自有属性：

```js
Object.keys(rabbit)
Object.values(rabbit)
Object.entries(rabbit)
```

判断属性是否属于对象自身，推荐：

```js
Object.hasOwn(rabbit, 'jumps') // true
Object.hasOwn(rabbit, 'eats') // false
```

兼容较旧环境时也可以使用：

```js
Object.prototype.hasOwnProperty.call(rabbit, 'eats')
```

不要只写：

```js
rabbit.eats !== undefined
```

因为属性可能存在，只是值刚好是 `undefined`：

```js
const object = { value: undefined }

console.log(object.value === undefined) // true
console.log(Object.hasOwn(object, 'value')) // true
```

---

# 十三、常见误区

## 误区 1：`prototype` 就是所有对象都有的原型

不准确。`prototype` 是函数的普通属性，主要用于 `new` 创建实例；每个对象都有的是内部的 `[[Prototype]]`。

## 误区 2：`__proto__` 和 `prototype` 是一回事

不是：

```text
obj.__proto__       → 访问 obj 的 [[Prototype]]
Constructor.prototype → 构造函数的普通属性
```

## 误区 3：继承会复制父对象属性

原型继承通常不是复制，而是在对象之间建立委托关系。子对象找不到属性时，沿着原型链去父对象查找。

## 误区 4：原型方法里的 `this` 指向原型

不对。`rabbit.walk()` 中的 `this` 是 `rabbit`，即使 `walk` 是从原型中找到的。

## 误区 5：修改 prototype 后，所有实例都一定变化

要区分“修改原对象”和“替换引用”：

```js
function Person() {}
const oldPrototype = Person.prototype
const person = new Person()

oldPrototype.sayHello = () => 'hello'
// person 可以访问，因为 person 仍然指向 oldPrototype

Person.prototype = {}
// 只是让 Person.prototype 指向了新对象
// 已有 person 仍然指向 oldPrototype
```

## 误区 6：所有 prototype 属性都适合放共享数据

方法通常适合共享；实例状态和可变引用类型通常应该放到构造函数中：

```js
function User() {
  this.roles = [] // 每个实例独立
}

User.prototype.getRoles = function () {
  return this.roles
}
```

---

# 十四、调试原型链的实用方法

```js
function Person(name) {
  this.name = name
}

Person.prototype.sayName = function () {
  return this.name
}

const person = new Person('小明')

console.log(Object.getPrototypeOf(person))
console.log(Object.getPrototypeOf(Person.prototype))
console.log(Object.getOwnPropertyNames(Person.prototype))
console.log(Object.hasOwn(person, 'name'))
console.log(Object.hasOwn(person, 'sayName'))
console.log(person instanceof Person)
console.log(Person.prototype.isPrototypeOf(person))
```

建议在浏览器开发者工具中使用 `console.dir(person)`，展开对象后观察 `[[Prototype]]`。

---

# 十五、性能与工程实践建议

1. 尽量在对象创建时确定原型，而不是频繁调用 `Object.setPrototypeOf()` 修改已有对象。
2. 原型链不宜过长，属性查找会逐级向上；不存在的属性尤其需要查完整条链。
3. 把共享方法放在 prototype 上，把每个实例独有的数据放在实例上。
4. 谨慎修改原生对象的 prototype，优先使用独立工具函数、组合对象或方法借用。
5. 原型对象上的方法通常应保持稳定，避免运行时频繁替换整个 prototype。
6. 对普通字典数据可考虑 `Object.create(null)`，但使用前要意识到它没有 `Object.prototype` 上的方法。
7. 新项目中优先使用 `class` 表达复杂的对象模型；理解原型机制有助于读懂类的底层行为。

---

# 十六、最终记忆口诀

```text
对象有 [[Prototype]]，函数有 prototype。

读取属性：先找自己，再沿原型链向上找。
写入属性：通常写到当前对象，setter 是例外。

new 做四件事：创建对象、连接原型、执行构造函数、决定最终返回值。

实例数据放构造函数，共享方法放 prototype。

原型链终点是 Object.prototype，Object.prototype 的原型是 null。

__proto__ 是历史访问方式，现代代码优先使用
Object.getPrototypeOf 和 Object.setPrototypeOf。
```

---

# 十七、建议练习

## 练习 1：画出原型链

```js
function Animal() {}
function Dog() {}

Dog.prototype = Object.create(Animal.prototype)
Dog.prototype.constructor = Dog

const dog = new Dog()
```

请写出 `dog` 到 `null` 的完整原型链。

答案：

```text
dog
  → Dog.prototype
  → Animal.prototype
  → Object.prototype
  → null
```

## 练习 2：判断属性来源

```js
const parent = { value: 1 }
const child = Object.create(parent)
child.name = 'child'

console.log(Object.hasOwn(child, 'value'))
console.log(Object.hasOwn(child, 'name'))
console.log(child.value)
```

答案：

```text
false
true
1
```

## 练习 3：观察共享方法和独立状态

```js
function Counter() {
  this.count = 0
}

Counter.prototype.increment = function () {
  this.count += 1
}

const counter1 = new Counter()
const counter2 = new Counter()

counter1.increment()

console.log(counter1.count) // 1
console.log(counter2.count) // 0
console.log(counter1.increment === counter2.increment) // true
```

结论：方法共享，状态独立。

---

# 参考资料

- [JavaScript.info：Prototypal inheritance](https://javascript.info/prototype-inheritance)
- [JavaScript.info：F.prototype](https://javascript.info/function-prototype)
- [JavaScript.info：Native prototypes](https://javascript.info/native-prototypes)
- [MDN：Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)
- [冴羽：JavaScript 深入之从原型到原型链](https://github.com/mqyqingfeng/Blog/issues/2)
- [冴羽：JavaScript 深入之 new 的模拟实现](https://github.com/mqyqingfeng/Blog/issues/13)
- [冴羽：JavaScript 深入之创建对象的多种方式以及优缺点](https://github.com/mqyqingfeng/Blog/issues/15)
- [冴羽：JavaScript 深入之继承的多种方式和优缺点](https://github.com/mqyqingfeng/Blog/issues/16)
