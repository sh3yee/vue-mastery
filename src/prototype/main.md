# 笔记标题：深入浅出 JavaScript 原型链继承

> 原型链继承让对象可以复用另一个对象上的属性和方法，解决了重复写代码、重复占内存的问题。

## 一、 建立认知：为什么需要 JavaScript 原型链继承？

- 痛点引入：
  - 多个对象都有同一个方法，如果每个对象都写一遍，会造成代码重复。
  - 调用 `arr.map()` 时，初学者会疑惑：数组对象里明明看不到 `map`，为什么能用？
  - 修改对象属性时，可能遇到“子对象覆盖父对象属性”的情况，导致结果和预期不同。
- 生活化类比：
  原型就像“公共工具箱”。每个学生不需要自己买一把剪刀，只要教室里有公共剪刀，大家都可以借来用。对象自己的属性就是“自己书包里的东西”，原型上的属性就是“公共工具箱里的东西”。查找属性时，JavaScript 会先翻自己的书包，找不到再去公共工具箱里找。

## 二、 核心概念与语法

- 概念定义：
  JavaScript 中每个普通对象都有一个内部链接，指向另一个对象，这个被指向的对象叫“原型”。当访问一个属性时，如果对象自己没有，JavaScript 会沿着原型一层层向上查找，直到找到属性或到达 `null`，这条查找路径就叫“原型链”。
- 核心语法：

```
const parent = {
  sayHello() {
    return "hello";
  }
};

const child = Object.create(parent);

console.log(child.sayHello());
```

输出结果：

```
hello
```

- 参数说明：

| 名称                    | 说明                                         | 是否必填 |
| ----------------------- | -------------------------------------------- | -------- |
| `parent`                | 要作为原型的对象，也就是公共工具箱           | 是       |
| `Object.create(parent)` | 创建一个新对象，并把 `parent` 设置为它的原型 | 是       |
| `child`                 | 新创建的对象，可以访问自己和原型上的属性     | 是       |

- 执行原理：
  1. JavaScript 先在 `child` 自己身上找 `sayHello`。
  2. 如果没找到，就去 `child` 的原型 `parent` 上找。
  3. 找到后执行这个函数。
  4. 如果一直找到 `null` 都没有，就返回 `undefined`。

## 三、 基础用法与代码示例

- 示例 1：通过原型复用方法

```
const userMethods = {
  login() {
    // this 指向调用 login 的具体对象
    return `${this.name} 登录成功`;
  }
};

const user = Object.create(userMethods);

// name 是 user 自己的属性
user.name = "小明";

console.log(user.login());
```

输出结果：

```
小明 登录成功
```

原理解析：

`login` 方法不在 `user` 自己身上，而在 `userMethods` 这个原型对象上。调用 `user.login()` 时，JavaScript 先找 `user.login`，找不到就沿着原型链去 `userMethods` 找。方法执行时，`this` 仍然指向调用者 `user`，所以能读到 `user.name`。

生活化类比：

`userMethods` 就像公司统一培训手册，所有员工都可以查手册办事；`user.name` 是员工自己的工牌信息。

- 示例 2：属性遮蔽，也就是子对象覆盖原型属性

```
const parent = {
  role: "普通用户"
};

const child = Object.create(parent);

console.log(child.role);

child.role = "管理员";

console.log(child.role);
console.log(parent.role);
```

输出结果：

```
普通用户
管理员
普通用户
```

原理解析：

第一次访问 `child.role` 时，`child` 自己没有 `role`，于是去原型 `parent` 上找到 `"普通用户"`。后来执行 `child.role = "管理员"`，这会在 `child` 自己身上创建一个新的 `role` 属性，并不会修改 `parent.role`。之后再访问 `child.role`，会优先拿到自己的 `"管理员"`。

生活化类比：

学校规定所有学生默认穿校服，这是原型属性。某个学生今天穿了社团服，这是自己的属性。老师看这个学生时，会先看到他身上的社团服，而不是默认校服。

## 四、 实用场景与常见陷阱

- 场景 1：把公共方法放到构造函数的 `prototype` 上

```
function Product(name, price) {
  // 每个商品自己的数据
  this.name = name;
  this.price = price;
}

// 所有商品共用同一个 getInfo 方法
Product.prototype.getInfo = function () {
  return `${this.name}: ${this.price} 元`;
};

const book = new Product("JavaScript 入门", 59);
const pen = new Product("签字笔", 3);

console.log(book.getInfo());
console.log(pen.getInfo());
console.log(book.getInfo === pen.getInfo);
```

输出结果：

```
JavaScript 入门: 59 元
签字笔: 3 元
true
```

原理解析：

`name` 和 `price` 每个商品都不同，所以放在实例对象自己身上。`getInfo` 的逻辑完全相同，所以放在 `Product.prototype` 上共享。这样所有实例都能使用同一个函数，减少重复创建函数造成的内存浪费。

- 场景 2：理解数组方法为什么能直接调用

```
const list = [1, 2, 3];

console.log(list.map(item => item * 2));
console.log(Object.getPrototypeOf(list) === Array.prototype);
```

输出结果：

```
[2, 4, 6]
true
```

原理解析：

`list` 自己身上没有 `map` 方法，但数组的原型是 `Array.prototype`，而 `map` 就定义在 `Array.prototype` 上。所以数组实例都可以直接调用 `map`、`filter`、`push` 等方法。

- 常见陷阱与注意事项：
  - 不要随便修改内置原型，例如 `Array.prototype.myMethod = ...`。这就像往公共教材里私自加内容，未来 JavaScript 官方如果也加了同名方法，可能导致冲突。
  - 不建议频繁使用 `Object.setPrototypeOf()` 改变已有对象的原型。对象原型像房子的地基，建好后再换地基通常成本很高，也可能影响性能。

## 五、 横向对比与记忆技巧 (若无可对比概念，此节可省略)

- 对比表格：

| 概念                    | 含义                            | 常见位置     |                  作用                  | 记忆方式                 |
| ----------------------- | ------------------------------- | ------------ | :------------------------------------: | ------------------------ |
| `[[Prototype]]`         | 对象内部真正指向原型的链接      | 每个对象内部 |         查找属性时沿着它向上找         | 对象背后的“上一层工具箱” |
| `__proto__`             | 访问 `[[Prototype]]` 的历史写法 | 对象上       | 能看到或设置原型，但不推荐作为主要写法 | 老式入口                 |
| `Constructor.prototype` | 构造函数的 `prototype` 属性     | 函数对象上   |      决定 `new` 出来的实例的原型       | 工厂给产品配的统一说明书 |
| `class`                 | 构造函数和原型的语法糖          | 类声明中     |      用更清晰的语法组织构造和方法      | 新包装，底层仍是原型机制 |

- 记忆技巧：
  `prototype` 看构造函数，`__proto__` 看实例对象；实例找方法，顺着原型链一路向上问。

## 六、 现代替代方案与总结

- 现代替代方案：

```
class Product {
  constructor(name, price) {
    this.name = name;
    this.price = price;
  }

  getInfo() {
    return `${this.name}: ${this.price} 元`;
  }
}

const book = new Product("JavaScript 入门", 59);

console.log(book.getInfo());
console.log(Object.getPrototypeOf(book) === Product.prototype);
```

输出结果：

```
JavaScript 入门: 59 元
true
```

说明：

ES6 的 `class` 写法更适合日常开发，因为结构清晰，更接近大多数初学者对“类”的理解。但它并没有发明一套新的继承系统，方法仍然会放到 `Product.prototype` 上。学习原型链，是为了看懂 `class` 背后的运行方式。

- 核心总结：
  - 对象属性查找规则是：先找自己，找不到再沿着原型链向上找。
  - 公共方法适合放在原型上，实例自己的数据适合放在对象自己身上。
  - `class` 是更现代、更推荐的写法，但理解原型链能帮助你真正读懂 JavaScript。
  - 不要轻易修改内置对象的原型，尤其是 `Object.prototype` 和 `Array.prototype`。

## 七、 扩展阅读 (供后期探索)

<details> <summary>点击展开深入了解相关底层概念</summary>


- `this` 绑定：函数执行时，`this` 通常由调用方式决定。
- `new` 运算符：创建新对象，并把构造函数的 `prototype` 连接到实例对象上。
- `Object.getPrototypeOf()`：用于读取一个对象的原型。
- `Object.create()`：用于创建一个指定原型的新对象。
- Monkey patching：运行时修改内置对象或第三方对象的行为，通常需要谨慎使用。
- 参考文档：[MDN: Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)

</details>