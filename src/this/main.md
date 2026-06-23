# JavaScript this 关键字详解笔记
一句话总结：`this` 是 JavaScript 中的一个关键字，它的值不是在函数定义时决定的，而是在函数被调用时根据调用方式动态确定的。可以把 `this` 理解为函数的一个“隐藏参数”，在函数执行时由 JavaScript 引擎自动传递。
## 全局上下文中的 this
无论是否在严格模式下，在全局执行上下域中（也就是在任何函数之外），`this` 都指向全局对象。在浏览器环境中，全局对象就是 `window`。
```javascript
// 在浏览器环境中
console.log(this === window); // true
this.b = "MDN";
console.log(window.b); // "MDN"
console.log(b); // "MDN" （因为 b 成为全局变量）
```
注意：如果源代码作为模块加载（例如在 HTML 中使用 `<script type="module">`），在顶层 `this` 总是 `undefined`。
## 函数上下文中的 this
当 `this` 出现在函数内部时，它的值完全取决于函数是怎么被调用的。主要有以下几种情况：
### 作为对象的方法调用
当函数作为对象的方法被调用时，`this` 指向调用该函数的那个对象。简单来说就是“谁调用了这个函数，`this` 就指向谁”。
```javascript
function getThis() {
  return this;
}
const obj1 = { name: "obj1" };
const obj2 = { name: "obj2" };
// 将同一个函数赋给不同对象
obj1.getThis = getThis;
obj2.getThis = getThis;
console.log(obj1.getThis()); // 输出: { name: 'obj1', getThis: [Function: getThis] }
console.log(obj2.getThis()); // 输出: { name: 'obj2', getThis: [Function: getThis] }
```
重点理解：`this` 指向的是调用函数的对象，而不是定义函数的对象。即使函数是定义在另一个对象上的，只要它被当前对象调用，`this` 就指向当前对象。
### 普通函数调用
在非严格模式下，如果函数直接被调用（前面没有任何对象），`this` 会指向全局对象（浏览器中是 `window`）。
```javascript
function showThis() {
  console.log(this);
}
showThis(); // 非严格模式下，输出: Window { ... }（浏览器中）
```
关于全局对象：在浏览器环境中，全局对象就是 window，它是浏览器提供的全局对象，包含了所有全局变量和函数。在 Node.js 环境中，全局对象是 global，而在 Web Worker 中是 self。为了跨环境兼容，ES2020 引入了 globalThis，它始终指向当前环境的全局对象。
```javascript
// 在任何环境中都可以使用 globalThis
console.log(globalThis === window); // 浏览器中为 true
console.log(globalThis === global); // Node.js 中为 true
```
但在严格模式下，直接调用的函数内部的 `this` 会是 `undefined`。严格模式是一种更安全、更严格的 JavaScript 变体，它帮助开发者避免一些不良实践。
```javascript
function showThisStrict() {
  "use strict";
  console.log(this);
}
showThisStrict(); // 输出: undefined
```
## 类上下文中的 this
类中的 `this` 行为与普通函数类似，但有一些特殊规则。
### 构造函数中的 this
当函数用作构造函数（使用 `new` 关键字）时，`this` 指向新创建的那个对象实例。
```javascript
function Person(name) {
  this.name = name; // 这里的 this 指向新创建的对象
}
const person = new Person("小红");
console.log(person.name); // "小红"
```
### 类方法中的 this
类方法中的 `this` 指向调用该方法的对象，通常也就是类的实例。
```javascript
class Car {
  constructor(brand) {
    this.brand = brand; // 构造函数中的 this 指向新实例
  }
  
  getBrand() {
    return this.brand; // 方法中的 this 指向调用该方法的对象
  }
}
const myCar = new Car("丰田");
console.log(myCar.getBrand()); // "丰田"
```
### 派生类构造函数中的 this
在派生类（使用 `extends` 继承父类）的构造函数中，`this` 在调用 `super()` 之前是未定义的。必须先调用 `super()` 才能安全使用 `this`。
```javascript
class Base {}
class Derived extends Base {
  constructor() {
    // 这里的 this 是未定义的，直到调用 super()
    super(); // 调用父类构造函数，创建 this 绑定
    console.log(this); // 现在可以安全使用 this
  }
}
const obj = new Derived();
```
## 构造函数和类中的 constructor
### 为什么方法叫做构造函数
从图片中可以看到，当函数被用作构造函数（使用 `new` 关键字调用）时，这个函数就被称为构造函数。构造函数的特殊之处在于：
1. **创建新对象**：使用 `new` 调用时，JavaScript 会自动创建一个新的空对象
2. **绑定 this**：在这个新对象中，`this` 指向这个新创建的对象
3. **初始化对象**：构造函数的代码会执行，通常用来给新对象添加属性和方法
```javascript
function Person(name) {
  this.name = name; // 这里的 this 指向新创建的对象
}
const person = new Person("小红");
console.log(person.name); // "小红"
```
### 类中的 constructor 是什么
在类（class）语法中，`constructor` 是一个特殊的方法，它有以下几个特点：
1. **自动调用**：当使用 `new` 关键字创建类实例时，`constructor` 会自动被调用
2. **初始化实例**：用于初始化新创建的对象实例
3. **只能有一个**：每个类只能有一个 `constructor` 方法
4. **默认存在**：如果类中没有定义 `constructor`，JavaScript 会自动添加一个空的 `constructor`
```javascript
class Car {
  constructor(brand) {
    this.brand = brand; // 构造函数中的 this 指向新实例
  }
  
  getBrand() {
    return this.brand; // 方法中的 this 指向调用该方法的对象
  }
}
const myCar = new Car("丰田");
console.log(myCar.getBrand()); // "丰田"
```
### 两者的关系
1. **本质相同**：类中的 `constructor` 本质上就是一个构造函数
2. **语法糖**：类语法是构造函数和原型继承的语法糖
3. **功能一致**：两者都用于创建和初始化对象
## 全局对象和 globalThis
全局对象和 `globalThis` 是两个相关但不同的概念。全局对象是 JavaScript 运行环境自动创建的一个特殊对象，所有全局变量和函数都会成为它的属性；而 `globalThis` 是 ES2020 引入的标准化访问方式，用于在不同环境下统一获取这个全局对象。
### 全局对象是什么
全局对象是一个始终存在于全局作用域中的特殊对象，由 JavaScript 运行时（宿主环境）提供。它有两个核心特点：第一，全局对象本身始终存在，不会被垃圾回收；第二，全局对象上存储的属性可以被全局访问，也就是在任何地方、任何时刻都能访问到。
不同环境下的全局对象具体表现为不同的对象：
- 在浏览器中：`window` 对象，代表浏览器窗口或 iframe
- 在 Node.js 中：`global` 对象
- 在 Web Worker 中：`self` 对象
这意味着，当你在全局作用域用 `var` 声明一个变量时，它实际上是挂载在全局对象上的。比如浏览器里 `var a = 1` 等价于 `window.a = 1`。
```javascript
// 浏览器环境
var a = 1;
console.log(window.a); // 1
// 但 let 和 const 声明的变量不会成为全局对象的属性
let b = 2;
console.log(window.b); // undefined
```
### globalThis 是什么
`globalThis` 是 ES2020 引入的一个全局属性，它提供一个跨环境的统一方式来访问全局对象。无论代码运行在浏览器、Node.js 还是 Web Worker 中，`globalThis` 始终指向当前环境的全局对象。
记忆方法很简单：全局作用域中的 `this` 就是 `globalThis`。
```javascript
// 浏览器环境
console.log(globalThis === window); // true
// Node.js 环境
console.log(globalThis === global); // true
// Web Worker 环境
console.log(globalThis === self); // true
```
在 `globalThis` 出现之前，要写跨环境兼容代码需要做很多判断：
```javascript
// 旧写法，需要判断环境
var getGlobal = function () {
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  throw new Error('无法找到全局对象');
};
```
现在只需直接用 `globalThis` 就行，代码简洁很多。
### 两者的关系
两者的核心区别在于：全局对象是一个抽象概念，而 `globalThis` 是访问这个对象的标准接口。可以把 `globalThis` 理解为"全局对象的统一入口"。
在大多数引擎中，`globalThis` 就是全局对象本身的引用。但在浏览器中有一个细节：由于 iframe 和跨窗口安全的考虑，`globalThis` 实际引用的是真实全局对象的一个 Proxy 代理。日常开发中这个区别基本可以忽略，但需要知道有这回事。
`globalThis` 始终保留对自身的引用，这是全局对象的一个特性：
```javascript
console.log(globalThis === globalThis.globalThis); // true（所有环境）
console.log(window === window.window); // true（浏览器）
console.log(global === global.global); // true（Node.js）
```
## 构造函数返回值对 this 的影响
当函数用作构造函数时，如果构造函数没有返回值，或者返回的是一个基本类型（如数字、字符串），那么 `new` 表达式的结果就是 `this` 对象。但如果构造函数明确返回一个对象，那么这个返回的对象会替代 `this` 成为 `new` 表达式的最终结果。
```javascript
function C() {
  this.a = 37; // this 指向新创建的对象
  // 没有 return，所以返回 this
}
let o = new C();
console.log(o.a); // 37
function C2() {
  this.a = 37;
  return { a: 38 }; // 返回一个新对象，this 被丢弃
}
o = new C2();
console.log(o.a); // 38
```
## 箭头函数中的 this
箭头函数是 ES6 引入的特性，它没有自己的 `this` 绑定。它会继承外层函数（或全局作用域）的 `this` 值。这是箭头函数与普通函数最重要的区别之一。
```javascript
const globalObject = this;
// 箭头函数
const foo = () => this;
console.log(foo() === globalObject); // true
// 普通函数
function bar() {
  return this;
}
console.log(bar() === globalObject); // 非严格模式下为 true，严格模式下为 false
```
理解关键点：因为箭头函数不绑定自己的 `this`，所以在对象方法中使用箭头函数时，它的 `this` 会继承自外层作用域（通常是全局对象），而不是指向对象本身。
```javascript
const obj = {
  name: "对象",
  // 普通函数方法
  normalMethod: function() {
    return this.name;
  },
  // 箭头函数方法
  arrowMethod: () => this.name
};
console.log(obj.normalMethod()); // "对象"（this 指向 obj）
console.log(obj.arrowMethod()); // undefined（this 继承自全局作用域）
```
使用场景：当你需要在回调函数中保持外层 `this` 的值时，箭头函数非常有用，比如在定时器或事件监听器中访问外层的实例。
## 显式设置 this (call、apply、bind)
JavaScript 提供了三种方法让你可以手动指定函数的 `this` 值。
### call() 方法
`call()` 方法调用一个函数，其第一个参数被指定为 `this` 的值，后续参数作为函数的参数依次传入。
```javascript
function add(c, d) {
  return this.a + this.b + c + d;
}
const o = { a: 1, b: 3 };
// 第一个参数是 this 值，后续参数是函数参数
add.call(o, 5, 7); // 1 + 3 + 5 + 7 = 16
```
### apply() 方法
`apply()` 方法与 `call()` 类似，区别在于第二个参数是一个数组（或类数组对象），数组的元素会作为函数的参数展开传入。
```javascript
function add(c, d) {
  return this.a + this.b + c + d;
}
const o = { a: 1, b: 3 };
// 第一个参数是 this 值，第二个参数是数组参数
add.apply(o, [10, 20]); // 1 + 3 + 10 + 20 = 34
```
### bind() 方法
`bind()` 方法不会立即调用函数，而是创建一个新的函数。在这个新函数中，`this` 被永久绑定到 `bind()` 的第一个参数上。
```javascript
function f() {
  return this.a;
}
// 创建一个新函数，this 永久绑定到 { a: "azerty" }
const g = f.bind({ a: "azerty" });
console.log(g()); // "azerty"
// bind 只能生效一次！
const h = g.bind({ a: "yoo" }); // 尝试再次绑定
console.log(h()); // 仍然输出 "azerty"
```
## DOM 事件处理器中的 this
当函数被用作 DOM 事件处理器（比如绑定到按钮的点击事件）时，`this` 指向触发事件的那个 HTML 元素。
```javascript
// 当元素被点击时，将其变为蓝色
function bluify(e) {
  console.log(this === e.currentTarget); // 总是 true
  this.style.backgroundColor = "#A5D9F3";
}
// 为页面所有元素添加点击监听器
const elements = document.getElementsByTagName("*");
for (const element of elements) {
  element.addEventListener("click", bluify, false);
}
```
在内联事件处理器中（直接写在 HTML 标签里的 onclick 等），`this` 也指向包含该事件的元素。
```html
<!-- 当点击按钮时，显示 "button" -->
<button onclick="alert(this.tagName.toLowerCase());">显示标签名</button>
```
注意：在内联事件处理器中，只有外层代码的 `this` 指向元素。如果内联代码中包含普通函数调用，内部函数中的 `this` 仍然遵循普通规则。
## 绑定方法保持 this 指向
有时我们希望类方法中的 `this` 总是指向类的实例，无论该方法如何被调用（比如被当作回调函数传递时，`this` 经常会丢失）。这可以通过在构造函数中使用 `bind()` 方法实现。
```javascript
class Car {
  constructor() {
    // 绑定 sayBye 方法，使其 this 总是指向 Car 实例
    this.sayBye = this.sayBye.bind(this);
  }
  
  sayHi() {
    console.log(`Hello from ${this.name}`);
  }
  
  sayBye() {
    console.log(`Bye from ${this.name}`);
  }
  
  get name() {
    return "Ferrari";
  }
}
class Bird {
  get name() {
    return "Tweety";
  }
}
const car = new Car();
const bird = new Bird();
// 未绑定方法：this 取决于调用者
car.sayHi(); // "Hello from Ferrari"
bird.sayHi = car.sayHi;
bird.sayHi(); // "Hello from Tweety"（this 指向 bird）
// 绑定方法：this 总是指向 car 实例
bird.sayBye = car.sayBye;
bird.sayBye(); // "Bye from Ferrari"（this 仍指向 car）
```
替代方案：使用箭头函数作为类属性也可以达到相同效果，但每个实例都会有自己的方法副本，这会增加内存使用。
## 严格模式对 this 的影响
严格模式对普通函数调用时的 `this` 行为有直接影响：
在非严格模式下，如果函数直接被调用且 `this` 是 `null` 或 `undefined`，它会被自动替换为全局对象；如果是原始值，会被替换为对应的包装对象。
而在严格模式下，JavaScript 不会进行这种替换，`this` 就保持其原本传入的值（通常是 `undefined`）。
```javascript
// 非严格模式
function nonStrict() {
  console.log(this);
}
nonStrict(); // Window {...}（浏览器中）
// 严格模式
function strict() {
  "use strict";
  console.log(this);
}
strict(); // undefined
```
## this 绑定规则总结表
调用方式 | 非严格模式 | 严格模式
---|---|---
普通函数调用 | 全局对象 | `undefined`
对象方法调用 | 调用方法的对象 | 调用方法的对象
构造函数调用 | 新创建的对象 | 新创建的对象
call/apply/bind | 指定的 `this` 值 | 指定的 `this` 值
箭头函数 | 外层函数的 `this` | 外层函数的 `this`
DOM 事件处理器 | 触发事件的元素 | 触发事件的元素
## 核心要点回顾
`this` 的值在函数调用时确定，而不是定义时确定。
普通函数的 `this` 取决于调用方式（作为方法、普通调用、构造函数等）。
箭头函数继承外层函数的 `this`，没有自己的 `this` 绑定。
使用 `call`、`apply`、`bind` 可以显式指定 `this` 的值。
严格模式改变了普通函数调用时 `this` 的默认行为。
## 参考文档
### 冴羽 JavaScript 深入系列
- [JavaScript 深入之从 ECMAScript 规范解读 this](https://github.com/mqyqingfeng/Blog/issues/5)
- [JavaScript 深入之 call 和 apply 的模拟实现](https://github.com/mqyqingfeng/Blog/issues/11)
- [JavaScript 深入之 bind 的模拟实现](https://github.com/mqyqingfeng/Blog/issues/14)
### MDN 官方文档
- [this](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/this)
- [Function.prototype.call](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/call)
- [Function.prototype.apply](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)
- [Function.prototype.bind](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)
---

