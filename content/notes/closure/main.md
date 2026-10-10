## 1. 闭包是什么？

闭包可以理解为：

> 一个函数，记住并持续访问它定义时所在作用域中的变量。

更完整地说：

> 闭包 = 函数 + 这个函数创建时能访问到的词法环境。

也就是说，函数不只是保存了一段代码，它还会“带着”自己定义时可以访问的外部变量。

例如：

```js
function outer() {
  const name = "Tom";

  function inner() {
    console.log(name);
  }

  return inner;
}

const fn = outer();

fn(); // Tom
```

这里 `outer()` 已经执行结束了，但 `fn()` 仍然可以访问 `outer` 里面的 `name`。

原因是：

```js
inner 函数形成了闭包
inner 记住了它定义时所在的词法环境
这个词法环境里有 name = "Tom"
```

所以即使 `outer()` 执行完了，只要 `inner` 函数还被外部引用着，`name` 就不会被销毁。

------

## 2. 闭包和词法作用域的关系

闭包依赖词法作用域。

词法作用域的意思是：

> 函数能访问哪些变量，主要看函数定义在哪里，而不是函数在哪里调用。

例如：

```js
const name = "global";

function outer() {
  const name = "outer";

  function inner() {
    console.log(name);
  }

  return inner;
}

const fn = outer();

fn(); // outer
```

虽然 `fn()` 是在全局作用域调用的，但 `inner` 函数是在 `outer` 里面定义的。

所以它访问的是定义位置上的 `name`，也就是：

```js
const name = "outer";
```

不是全局的：

```js
const name = "global";
```

一句话总结：

> 词法作用域决定函数能访问谁，闭包让函数在外部作用域结束后仍然可以继续访问它。

------

## 3. 闭包不是保存值，而是保存变量的引用

这是最容易误解的地方。

闭包保存的不是某一刻的值，而是对变量本身的持续访问。

例如：

```js
var studentName = "Frank";

var greeting = function () {
  console.log("Hello, " + studentName);
};

studentName = "Suzy";

greeting(); // Hello, Suzy
```

很多人以为 `greeting` 创建时，`studentName` 是 `"Frank"`，所以它应该打印：

```js
Hello, Frank
```

但实际打印的是：

```js
Hello, Suzy
```

原因是：

```js
函数没有保存 "Frank" 这个值
函数保存的是 studentName 这个变量
```

当 `greeting()` 真正执行时，它才去读取 `studentName` 当前的值。

此时 `studentName` 已经变成了：

```js
"Suzy"
```

所以结果是：

```js
Hello, Suzy
```

------

## 4. 闭包是“实时链接”，不是“快照”

可以这样理解：

错误理解：

```js
函数创建时，把外部变量的值拍了一张照片保存起来
```

正确理解：

```js
函数创建时，保留了访问外部变量的通道
以后函数执行时，会通过这个通道读取变量当前的值
```

所以闭包中的变量不仅可以被读取，还可以被修改。

例如计数器：

```js
function makeCounter() {
  let count = 0;

  return function () {
    count++;
    return count;
  };
}

const counter = makeCounter();

console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

这里 `count` 没有在 `makeCounter()` 执行结束后消失。

因为返回的内部函数仍然引用着 `count`。

每次调用 `counter()`，访问的都是同一个 `count` 变量。

------

## 5. 闭包和函数实例有关

每次调用外层函数，都会创建一个新的词法环境。

例如：

```js
function makeAdder(x) {
  return function (y) {
    return x + y;
  };
}

const add5 = makeAdder(5);
const add10 = makeAdder(10);

console.log(add5(2));  // 7
console.log(add10(2)); // 12
```

这里 `add5` 和 `add10` 使用的是同一份函数代码：

```js
function (y) {
  return x + y;
}
```

但它们对应的是不同的词法环境。

可以理解为：

```js
add5  记住的 x 是 5
add10 记住的 x 是 10
```

所以：

```js
add5(2)  => 5 + 2
add10(2) => 10 + 2
```

注意：

> 闭包不是只和函数代码有关，而是和函数实例有关。

外层函数每执行一次，就可能创建一个新的闭包环境。

------

## 6. 事件回调中的闭包

闭包在前端事件中非常常见。

例如：

```js
function listenForClicks(btn, label) {
  btn.addEventListener("click", function () {
    console.log(label + " button was clicked");
  });
}

const submitBtn = document.getElementById("submit");

listenForClicks(submitBtn, "Submit");
```

当 `listenForClicks()` 执行结束后，参数 `label` 按理说应该销毁。

但是点击按钮时，回调函数仍然可以访问 `label`。

原因是：

```js
点击事件的回调函数形成了闭包
它保留了对 label 变量的访问
```

所以按钮点击时仍然可以打印：

```js
Submit button was clicked
```

------

## 7. makeSizer 示例

这是 MDN 中非常经典的闭包例子。

```js
function makeSizer(size) {
  return function () {
    document.body.style.fontSize = size + "px";
  };
}

const size12 = makeSizer(12);
const size14 = makeSizer(14);
const size16 = makeSizer(16);

document.getElementById("size-12").onclick = size12;
document.getElementById("size-14").onclick = size14;
document.getElementById("size-16").onclick = size16;
```

这里：

```js
makeSizer(12)
```

返回了一个函数：

```js
function () {
  document.body.style.fontSize = "12px";
}
```

更准确地说，这个返回的函数记住了 `size = 12` 这个变量环境。

所以点击按钮时，才会执行里面的代码。

注意区别：

```js
document.getElementById("size-12").onclick = size12;
```

这里是把函数交给 `onclick`。

而不是这样：

```js
document.getElementById("size-12").onclick = size12();
```

如果写成 `size12()`，就是立即执行函数，把执行结果赋值给 `onclick`。

------

## 8. 循环中的闭包常见错误

经典错误代码1：

```js
function showHelp(help) {
  document.getElementById("help").textContent = help;
}

function setupHelp() {
  var helpText = [
    { id: "email", help: "Your email address" },
    { id: "name", help: "Your full name" },
    { id: "age", help: "Your age (you must be over 16)" },
  ];

  for (var i = 0; i < helpText.length; i++) {
    var item = helpText[i];

    document.getElementById(item.id).onfocus = function () {
      showHelp(item.help);
    };
  }
}

setupHelp();
```

预期效果：

```js
聚焦 email => 显示 email 提示
聚焦 name  => 显示 name 提示
聚焦 age   => 显示 age 提示
```

实际效果：

```js
无论聚焦哪个输入框，都会显示 age 的提示
```

原因是：

```js
var item 是函数作用域
整个 setupHelp 函数中只有一个 item 变量
```

循环每次只是修改同一个 `item`：

```js
第 1 次循环：item = email
第 2 次循环：item = name
第 3 次循环：item = age
```

事件函数里写的是：

```js
showHelp(item.help);
```

它并没有保存当时的 `item.help` 值。

它保存的是：

```js
以后执行时，去找 item 这个变量，再读取 item.help
```

等用户真正触发 `onfocus` 时，循环早就结束了。

此时 `item` 已经变成了最后一项：

```js
{ id: "age", help: "Your age (you must be over 16)" }
```

所以三个输入框都显示 age 的提示。

经典错误代码 2：

```js
var keeps = [];

for (var i = 0; i < 3; i++) {
  keeps[i] = function keepI() {
    // 封闭 i
    return i;
  };
}

keeps[0](); // 3
keeps[1](); // 3
keeps[2](); // 3
```

预期效果

```js
keeps[0](); // 0
keeps[1](); // 1
keeps[2](); // 2
```

我们可能会以为：

```js
第 1 次循环，函数记住 i = 0
第 2 次循环，函数记住 i = 1
第 3 次循环，函数记住 i = 2
```

所以三个函数应该分别返回 `0、1、2`。

------

实际效果

```js
keeps[0](); // 3
keeps[1](); // 3
keeps[2](); // 3
```

三个函数都返回了 `3`。

------

错误原因

核心原因是：

> `var` 是函数作用域，不是块级作用域。

所以这段代码：

```js
for (var i = 0; i < 3; i++) {
  keeps[i] = function keepI() {
    return i;
  };
}
```

可以理解成：

```js
var i;

for (i = 0; i < 3; i++) {
  keeps[i] = function keepI() {
    return i;
  };
}
```

也就是说，整个循环中只有一个共享的 `i` 变量。

三个函数闭包引用的都是这个同一个 `i`，而不是每次循环各自独立的 `i`。

------

关键执行过程

第 1 次循环

```js
i = 0;

keeps[0] = function keepI() {
  return i;
};
```

此时创建了第一个函数。

但是这个函数并没有保存 `0`，它只是记住：

```js
以后执行时，去访问变量 i
```

------

第 2 次循环

```js
i = 1;

keeps[1] = function keepI() {
  return i;
};
```

此时创建了第二个函数。

它也没有保存 `1`，仍然只是记住：

```js
以后执行时，去访问变量 i
```

------

第 3 次循环

```js
i = 2;

keeps[2] = function keepI() {
  return i;
};
```

此时创建了第三个函数。

它也没有保存 `2`，依然访问的是同一个 `i`。

------

循环结束

第三次循环结束后，还会执行一次：

```js
i++;
```

所以：

```js
i = 3;
```

然后判断：

```js
i < 3
```

也就是：

```js
3 < 3 // false
```

循环结束。

------

为什么最终都是 3？

循环结束后，数组中保存的是三个函数：

```js
keeps[0] = function keepI() {
  return i;
};

keeps[1] = function keepI() {
  return i;
};

keeps[2] = function keepI() {
  return i;
};
```

它们访问的是同一个变量 `i`。

当执行：

```js
keeps[0]();
```

函数才真正执行：

```js
return i;
```

此时 `i` 已经是 `3`，所以返回：

```js
3
```

同理：

```js
keeps[1](); // 3
keeps[2](); // 3
```

------

正确写法：使用 `let`

```js
var keeps = [];

for (let i = 0; i < 3; i++) {
  keeps[i] = function keepI() {
    return i;
  };
}

keeps[0](); // 0
keeps[1](); // 1
keeps[2](); // 2
```

`let` 是块级作用域。

在 `for` 循环中，`let` 会为每一次循环创建一个新的 `i`。

可以理解成：

```js
第 1 次循环：创建新的 i = 0
第 2 次循环：创建新的 i = 1
第 3 次循环：创建新的 i = 2
```

所以三个函数引用的是三个不同的 `i`。

------

总结

这个例子的关键不是：

```js
闭包记住了 0、1、2
```

而是：

```js
闭包记住了变量 i
```

由于 `var i` 在整个循环中只有一个，所以三个函数访问的是同一个 `i`。

等函数真正执行时，循环已经结束，`i` 已经变成了 `3`。

一句话总结：

> `var` 循环中的闭包，闭的是同一个变量；
> `let` 循环中的闭包，每次循环闭的是新的变量。

```js
var keeps = [];

for (var i = 0; i < 3; i++) {
  keeps[i] = function keepI() {
    // 封闭 i
    return i;
  };
}

keeps[0](); // 3
keeps[1](); // 3
keeps[2](); // 3
```

预期效果

```js
keeps[0](); // 0
keeps[1](); // 1
keeps[2](); // 2
```

我们可能会以为：

```js
第 1 次循环，函数记住 i = 0
第 2 次循环，函数记住 i = 1
第 3 次循环，函数记住 i = 2
```

所以三个函数应该分别返回 `0、1、2`。

------

实际效果

```js
keeps[0](); // 3
keeps[1](); // 3
keeps[2](); // 3
```

三个函数都返回了 `3`。

------

错误原因

核心原因是：

> `var` 是函数作用域，不是块级作用域。

所以这段代码：

```js
for (var i = 0; i < 3; i++) {
  keeps[i] = function keepI() {
    return i;
  };
}
```

可以理解成：

```js
var i;

for (i = 0; i < 3; i++) {
  keeps[i] = function keepI() {
    return i;
  };
}
```

也就是说，整个循环中只有一个共享的 `i` 变量。

三个函数闭包引用的都是这个同一个 `i`，而不是每次循环各自独立的 `i`。

------

### 关键执行过程

#### 第 1 次循环

```js
i = 0;

keeps[0] = function keepI() {
  return i;
};
```

此时创建了第一个函数。

但是这个函数并没有保存 `0`，它只是记住：

```js
以后执行时，去访问变量 i
```

------

#### 第 2 次循环

```js
i = 1;

keeps[1] = function keepI() {
  return i;
};
```

此时创建了第二个函数。

它也没有保存 `1`，仍然只是记住：

```js
以后执行时，去访问变量 i
```

------

#### 第 3 次循环

```js
i = 2;

keeps[2] = function keepI() {
  return i;
};
```

此时创建了第三个函数。

它也没有保存 `2`，依然访问的是同一个 `i`。

------

#### 循环结束

第三次循环结束后，还会执行一次：

```js
i++;
```

所以：

```js
i = 3;
```

然后判断：

```js
i < 3
```

也就是：

```js
3 < 3 // false
```

循环结束。

------

### 为什么最终都是 3？

循环结束后，数组中保存的是三个函数：

```js
keeps[0] = function keepI() {
  return i;
};

keeps[1] = function keepI() {
  return i;
};

keeps[2] = function keepI() {
  return i;
};
```

它们访问的是同一个变量 `i`。

当执行：

```js
keeps[0]();
```

函数才真正执行：

```js
return i;
```

此时 `i` 已经是 `3`，所以返回：

```js
3
```

同理：

```js
keeps[1](); // 3
keeps[2](); // 3
```

------

### 正确写法：使用 `let`

```js
var keeps = [];

for (let i = 0; i < 3; i++) {
  keeps[i] = function keepI() {
    return i;
  };
}

keeps[0](); // 0
keeps[1](); // 1
keeps[2](); // 2
```

`let` 是块级作用域。

在 `for` 循环中，`let` 会为每一次循环创建一个新的 `i`。

可以理解成：

```js
第 1 次循环：创建新的 i = 0
第 2 次循环：创建新的 i = 1
第 3 次循环：创建新的 i = 2
```

所以三个函数引用的是三个不同的 `i`。

------

### 总结

这个例子的关键不是：

```js
闭包记住了 0、1、2
```

而是：

```js
闭包记住了变量 i
```

由于 `var i` 在整个循环中只有一个，所以三个函数访问的是同一个 `i`。

等函数真正执行时，循环已经结束，`i` 已经变成了 `3`。

一句话总结：

> `var` 循环中的闭包，闭的是同一个变量；
> `let` 循环中的闭包，每次循环闭的是新的变量。

------

## 9. 为什么 let 可以解决循环闭包问题？

把 `var` 改成 `let`：

```js
function setupHelp() {
  const helpText = [
    { id: "email", help: "Your email address" },
    { id: "name", help: "Your full name" },
    { id: "age", help: "Your age (you must be over 16)" },
  ];

  for (let i = 0; i < helpText.length; i++) {
    let item = helpText[i];

    document.getElementById(item.id).onfocus = function () {
      showHelp(item.help);
    };
  }
}
```

`let` 是块级作用域。

在 `for` 循环中，`let` 会为每次循环创建新的变量绑定。

可以理解为：

```js
第 1 次循环：创建一个新的 item，值是 email
第 2 次循环：创建一个新的 item，值是 name
第 3 次循环：创建一个新的 item，值是 age
```

所以每个事件函数引用的不是同一个 `item`，而是各自那次循环中的 `item`。

因此可以正确显示对应的提示。

------

## 10. 用闭包模拟私有变量

闭包可以用来隐藏数据。

例如：

```js
function createCounter() {
  let count = 0;

  return {
    increment() {
      count++;
    },
    decrement() {
      count--;
    },
    value() {
      return count;
    },
  };
}

const counter = createCounter();

counter.increment();
counter.increment();

console.log(counter.value()); // 2
```

外部不能直接访问：

```js
counter.count; // undefined
```

因为 `count` 是 `createCounter` 函数内部的局部变量。

但是返回的三个方法都形成了闭包：

```js
increment()
decrement()
value()
```

它们都能访问同一个 `count`。

所以这就实现了类似“私有变量”的效果。

------

## 11. 闭包和作用域链

函数查找变量时，会沿着作用域链一层一层往外找。

例如：

```js
const e = 10;

function sum(a) {
  return function (b) {
    return function (c) {
      return function (d) {
        return a + b + c + d + e;
      };
    };
  };
}

console.log(sum(1)(2)(3)(4)); // 20
```

最里面的函数可以访问：

```js
d：自己的参数
c：外层函数的参数
b：更外层函数的参数
a：更更外层函数的参数
e：全局变量
```

所以结果是：

```js
1 + 2 + 3 + 4 + 10 = 20
```

这就是作用域链。

闭包让内部函数即使被拿到外部执行，也仍然能沿着原来的词法作用域链访问变量。

------

## 12. 闭包和内存

闭包会让被引用的变量继续保存在内存中。

例如：

```js
function outer() {
  const bigData = new Array(1000000).fill("*");

  return function () {
    console.log(bigData.length);
  };
}

const fn = outer();
```

只要 `fn` 还存在，`bigData` 就不能被垃圾回收。

因为 `fn` 形成了闭包，仍然需要访问 `bigData`。

如果不再需要这个函数引用，应该释放掉：

```js
fn = null;
```

在实际开发中，事件监听也要注意移除：

```js
element.removeEventListener("click", handler);
```

否则某些闭包可能会长期占用内存。

------

## 13. 闭包的常见应用场景

### 1. 事件回调

```js
function bindClick(btn, text) {
  btn.onclick = function () {
    console.log(text);
  };
}
```

### 2. 函数工厂

```js
function multiplyBy(x) {
  return function (y) {
    return x * y;
  };
}

const double = multiplyBy(2);

console.log(double(5)); // 10
```

### 3. 私有变量

```js
function createUser() {
  let name = "Tom";

  return {
    getName() {
      return name;
    },
    setName(newName) {
      name = newName;
    },
  };
}
```

### 4. 防抖、节流

```js
function debounce(fn, delay) {
  let timer = null;

  return function () {
    clearTimeout(timer);

    timer = setTimeout(() => {
      fn();
    }, delay);
  };
}
```

这里 `timer` 被内部函数记住了，所以每次调用都能访问同一个定时器变量。

------

## 14. 闭包、词法作用域、作用域链的区别

### 词法作用域

关注的是：

```js
函数定义在哪里
变量能在哪里被访问
```

它是一套变量查找规则。

------

### 作用域链

关注的是：

```js
当前作用域找不到变量时，往哪里继续找
```

比如：

```js
当前函数作用域 -> 外层函数作用域 -> 全局作用域
```

------

### 闭包

关注的是：

```js
函数被拿到外部执行后，为什么还能访问原来外部函数里的变量
```

闭包是函数和它定义时的词法环境之间的关系。

------

## 15. 判断是否形成闭包

可以用这几个条件判断：

1. 是否有函数？
2. 函数内部是否访问了外部作用域的变量？
3. 这个函数是否在原来的作用域之外被调用，或者在外层函数结束后仍然被使用？

例如：

```js
function outer() {
  const msg = "hello";

  return function inner() {
    console.log(msg);
  };
}

const fn = outer();

fn();
```

这里就是闭包。

因为：

```js
inner 是函数
inner 使用了外部变量 msg
outer 执行结束后，inner 仍然被 fn 引用并调用
```

------

## 16. 一句话总结

闭包的核心不是“函数里面套函数”。

闭包的核心是：

> 函数记住了它定义时所在的词法环境，并且可以在之后继续访问那个环境中的变量。

更重要的是：

> 闭包保存的是变量本身的实时链接，不是某一刻的值快照。

所以理解闭包时，要重点记住三件事：

```js
1. 函数在哪里定义，决定它能访问哪些变量
2. 函数被保存到外部后，仍然能访问定义时的外部变量
3. 闭包保存的是变量，不是变量当时的值
```