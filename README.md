# Vue Mastery

**简体中文** | [English](README.en.md)

一个基于 Vue 3 的 JavaScript 学习项目，把知识笔记、可运行示例和练习题放在一起，方便边读、边改、边验证。

## 学习内容

| 分类 | 主题 |
| --- | --- |
| 基础概念 | 词法作用域、闭包、this 绑定、原型与继承、深拷贝 |
| 函数与应用 | call、apply、手写调用与对象创建、防抖与节流 |
| 异步与调度 | 事件循环、Promise |
| 动手实验 | Promise 与事件循环输出题 |

笔记和练习内容目前以中文为主。

## 使用方式

- **阅读笔记**：按分类浏览，通过章节目录定位内容，查看关系图和折叠说明。
- **运行示例**：直接编辑、运行笔记中的 JavaScript 示例，观察输出，修改条件验证理解。
- **完成练习**：先预测执行结果，再运行代码，对照预期输出与解析。

页面支持移动端阅读和章节链接分享。本地开发模式下，实验题的代码修改会自动保存到 `public/runner-edits.json`；构建预览模式不会写入该文件。

## 快速开始

需要 **Bun 1.4.2 或更新版本**。在项目根目录执行：

```powershell
bun install --frozen-lockfile
bun run dev
```

打开终端显示的本地地址即可开始阅读和练习。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `bun run dev` | 启动本地开发服务 |
| `bun run type-check` | 检查 TypeScript 与 Vue 组件类型 |
| `bun run build` | 先检查类型，再构建到 `dist` |
| `bun run build-only` | 仅构建，跳过类型检查 |
| `bun run preview` | 在本地预览已有构建结果 |

## 项目结构

| 路径 | 内容 |
| --- | --- |
| `src/<主题>/main.md` | 各主题的学习笔记 |
| `src/notes/` | 笔记展示、章节导航与章节注册 |
| `src/topics/` | 实验题目、预期输出与解析 |
| `src/runner/` | 代码编辑器、运行器与输出面板 |
| `notes-plugin.ts` | 将 Markdown 笔记转换为页面内容 |
| `notebook.md` | 学习笔记的编写与整理规范 |

技术栈：Vue 3、TypeScript、Vite、Bun。

## 补充学习内容

**修改笔记**：编辑对应主题的 `main.md`。编写规范见 [notebook.md](notebook.md)，示例应保持短小，并能独立运行。

**新增笔记**：创建 `src/<主题>/main.md`，然后在 `src/notes/chapters.ts` 的 `noteDefinitions` 中登记章节。

**新增实验**：参考 `src/topics/promise-event-loop/index.ts` 定义题目、预期输出与解析，再在 `src/topics/index.ts` 中注册专题。
