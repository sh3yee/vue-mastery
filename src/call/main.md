# `Function.prototype.call()` 学习笔记

> 原始资料：[MDN - Function.prototype.call()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call)  
>
> 页面标题：`Function.prototype.call() - JavaScript | MDN`  
>
> 读取结果：HTTP `200`  
>
> MDN 页面最后修改时间：2025-07-10

## 1. 一句话理解

`call()` 会**立即执行一个函数**，并允许我们手动指定函数执行时的 `this`，其余参数则逐个传入函数。

```javascript
函数.call(thisArg, 参数1, 参数2, ...);
```

可以把它理解成：

> 临时把一个函数“借给”某个对象使用，但不需要真的把函数添加到该对象上。

---

## 2. MDN 给出的定义

MDN 对 `call()` 的核心定义是：

> `Function` 实例的 `call()` 方法，会使用给定的 `this` 值和逐个提供的参数调用该函数。

这里有三个重点：

1. `call()` 是函数的方法，因此只有可调用的函数才能使用它。
2. `call()` 会立即执行原函数。
3. 参数是一个一个传入的，而不是放进数组中。

---

## 3. 语法、参数与返回值

MDN 给出的语法如下：

```javascript
call(thisArg)
call(thisArg, arg1)
call(thisArg, arg1, arg2)
call(thisArg, arg1, arg2, /* ... */ argN)
```

假设存在函数 `func`，实际使用形式是：

```javascript
func.call(thisArg, arg1, arg2);
```

| 部分 | 含义 |
| --- | --- |
| `func` | 要执行的函数 |
| `thisArg` | 本次执行时，函数内部使用的 `this` |
| `arg1...argN` | 依次传给 `func` 的普通参数 |
| 返回值 | `func` 执行后的返回值 |

```javascript
function add(a, b) {
  return a + b;
}

const result = add.call(null, 10, 20);
console.log(result); // 30
```

`add()` 没有使用 `this`，所以这里不关心 `thisArg`，可以传入 `null`。

---

## 4. 为什么需要手动指定 `this`

一般通过对象调用方法时，方法中的 `this` 指向点号前面的对象：

```javascript
const user = {
  name: "小明",
  introduce() {
    console.log(`我是${this.name}`);
  },
};

user.introduce(); // 我是小明
```

而 `call()` 可以在不修改对象的情况下，指定另一个对象作为 `this`：

```javascript
function introduce(greeting) {
  return `${greeting}，我是${this.name}`;
}

const user = { name: "小明" };

console.log(introduce.call(user, "你好"));
// 你好，我是小明
```

本次执行中：

```javascript
this === user; // true
```

---

## 5. MDN 示例：让普通函数使用指定对象

MDN 使用了下面的例子：

```javascript
function greet() {
  console.log(this.animal, "typically sleep between", this.sleepDuration);
}

const obj = {
  animal: "cats",
  sleepDuration: "12 and 16 hours",
};

greet.call(obj);
// cats typically sleep between 12 and 16 hours
```

虽然 `greet` 不是 `obj` 的方法，但是 `greet.call(obj)` 让 `greet` 本次执行时的 `this` 指向了 `obj`。

这正是 `call()` 最核心的能力：**函数不必属于某个对象，也可以临时使用该对象的数据。**

---

## 6. `thisArg` 在不同模式下的表现

### 6.1 非严格模式

根据 MDN：

- `thisArg` 是 `null` 或 `undefined` 时，会被替换为全局对象 `globalThis`。
- 字符串、数字、布尔值等原始值会被临时包装成对象。

```javascript
globalThis.globProp = "foo";

function display() {
  console.log(`globProp value is ${this.globProp}`);
}

display.call();
// globProp value is foo
```

省略 `thisArg` 等价于传入 `undefined`。因为函数处于非严格模式，`this` 最终变成了 `globalThis`。

### 6.2 严格模式

严格模式不会自动替换 `this`：

```javascript
"use strict";

globalThis.globProp = "foo";

function display() {
  console.log(`globProp value is ${this.globProp}`);
}

display.call();
// TypeError，因为 this 是 undefined
```

可以记成：

| 调用方式 | 非严格模式中的 `this` | 严格模式中的 `this` |
| --- | --- | --- |
| `fn.call()` | `globalThis` | `undefined` |
| `fn.call(null)` | `globalThis` | `null` |
| `fn.call(123)` | 包装后的数字对象 | 数字 `123` |

现代 JavaScript 中，不应依赖 `this` 自动指向全局对象，因为这种行为容易造成隐蔽错误。

---

## 7. `call()` 与 `apply()` 的区别

MDN 指出，两者几乎相同，主要区别在参数形式：

```javascript
func.call(thisArg, "eat", "bananas");
func.apply(thisArg, ["eat", "bananas"]);
```

| 方法 | 是否立即执行 | 普通参数的传递方式 |
| --- | --- | --- |
| `call()` | 是 | 逐个传入 |
| `apply()` | 是 | 放在数组或类数组对象中 |

如果参数已经在数组中，现代 JavaScript 也可以使用展开语法：

```javascript
const args = ["eat", "bananas"];
func.call(thisArg, ...args);
```

---

## 8. `call()` 与 `bind()` 的区别

`call()` 会立即执行，而 `bind()` 不会执行原函数，只会返回一个绑定好 `this` 的新函数。

```javascript
function introduce() {
  return this.name;
}

const user = { name: "小明" };

introduce.call(user); // 立即执行，返回“小明”

const boundIntroduce = introduce.bind(user);
boundIntroduce(); // 稍后执行，返回“小明”
```

记忆方式：

- `call`：现在调用。
- `apply`：现在调用，但参数用数组提供。
- `bind`：先绑定，稍后调用。

---

## 9. MDN 重点警告：不要用 `call()` 串联构造函数

MDN 的“Try it”示例展示了一种传统写法：

```javascript
function Product(name, price) {
  this.name = name;
  this.price = price;
}

function Food(name, price) {
  Product.call(this, name, price);
  this.category = "food";
}

console.log(new Food("cheese", 5).name);
// cheese
```

它能复用 `Product` 中的属性初始化代码，但 MDN 明确警告：**不要把这种写法当成实现继承的方式。**

原因包括：

- 构造函数只是作为普通函数执行，此时 `new.target` 是 `undefined`。
- `class` 构造器必须通过 `new` 或继承机制调用，不能使用 `call()` 调用。
- 它只复用了初始化逻辑，没有建立完整、正确的继承关系。

```javascript
class Product {}

Product.call({});
// TypeError: Class constructor Product cannot be invoked without 'new'
```

现代类继承应使用 `extends` 和 `super()`：

```javascript
class Product {
  constructor(name, price) {
    this.name = name;
    this.price = price;
  }
}

class Food extends Product {
  constructor(name, price) {
    super(name, price);
    this.category = "food";
  }
}
```

MDN 还提到，在更底层、确实需要动态构造对象时，可以考虑 `Reflect.construct()`。

---

## 10. MDN 进阶示例：把类数组对象转为数组

`Array.prototype.slice` 是数组的切片方法：从数组中取出一部分内容，返回一个新数组，且不修改原数组。

```javascript
const fruits = ["apple", "banana", "orange"];

console.log(fruits.slice(1));
// ["banana", "orange"]

console.log(fruits.slice());
// ["apple", "banana", "orange"]，复制整个数组
```

`arguments` 是普通函数中保存全部实参的对象。它可以按下标取值，也有 `length`，但它不是真正的数组：

```javascript
function example() {
  console.log(arguments[0]); // "a"
  console.log(arguments.length); // 2
  console.log(Array.isArray(arguments)); // false
}

example("a", "b");
```

因此，可以用 `call()` 临时让数组的 `slice()` 处理 `arguments`：

```javascript
function example() {
  return Array.prototype.slice.call(arguments);
}

console.log(example("a", "b"));
// ["a", "b"]
```

这句代码可以理解为：**让 `slice()` 把 `arguments` 当作数组，复制其中的全部内容，得到一个真正的新数组。**

现代 JavaScript 中，更推荐下面两种更清晰的写法：

```javascript
function example() {
  return Array.from(arguments);
}

function anotherExample(...args) {
  return args;
}
```

MDN 还给出了把这段逻辑封装成工具函数的进阶写法：

```javascript
const slice = Function.prototype.call.bind(Array.prototype.slice);

function example() {
  return slice(arguments);
}
```

它最终仍然等价于 `Array.prototype.slice.call(arguments)`。初学阶段理解前面的直接写法即可，不需要记住这个 `bind()` 组合。

---

## 11. 补充知识：箭头函数不能通过 `call()` 改变 `this`

> 本节是理解 `call()` 边界的补充知识，不是该 MDN 页面示例的主体。

箭头函数没有自己的 `this`，而是从外层词法作用域继承 `this`，所以 `call()` 传入的 `thisArg` 对它无效：

```javascript
const arrow = () => console.log(this);

arrow.call({ name: "小明" });
// 不会让箭头函数的 this 指向该对象
```

如果确实需要动态指定 `this`，应使用普通函数：

```javascript
function normalFunction() {
  console.log(this.name);
}

normalFunction.call({ name: "小明" }); // 小明
```

---

## 12. 常见误区

### 误区一：`call()` 会永久改变函数的 `this`

不会。它只影响当前这一次调用：

```javascript
function showName() {
  console.log(this?.name);
}

showName.call({ name: "小明" }); // 小明
showName(); // 不会继续使用上一个对象
```

### 误区二：`call()` 会返回一个新函数

不会。`call()` 返回的是原函数本次执行的结果。需要新函数时应使用 `bind()`。

### 误区三：`thisArg` 是原函数的第一个普通参数

不是。`thisArg` 专门用于指定 `this`，不会进入函数的形参列表。

```javascript
function test(a, b) {
  console.log(a, b);
}

test.call({ name: "context" }, 1, 2);
// a 是 1，b 是 2
```

### 误区四：任何函数都可以通过 `call()` 改变 `this`

箭头函数是例外；类构造器也不能通过 `call()` 当作普通函数执行。

---

## 13. 一个完整练习

```javascript
function calculate(discount, shippingFee) {
  return this.price * (1 - discount) + shippingFee;
}

const product = {
  name: "键盘",
  price: 100,
};

const finalPrice = calculate.call(product, 0.1, 5);
console.log(finalPrice); // 95
```

执行时可以按下面的顺序思考：

1. 要执行的函数是 `calculate`。
2. `call()` 的第一个参数是 `product`，所以 `this === product`。
3. `0.1` 传给 `discount`。
4. `5` 传给 `shippingFee`。
5. 最终计算：`100 × (1 - 0.1) + 5 = 95`。

---

## 14. 最终总结

```javascript
func.call(thisArg, arg1, arg2, ...);
```

需要牢牢记住的五件事：

1. `call()` 会立即执行函数。
2. 第一个参数指定本次执行中的 `this`。
3. 后续参数逐个传给原函数。
4. 严格模式与非严格模式对 `null`、`undefined` 的处理不同。
5. 不要用 `call()` 模拟现代类继承，应使用 `extends` 和 `super()`。

一句口诀：

> `call` 立即调用，先传 `this`，再把普通参数一个一个传进去。