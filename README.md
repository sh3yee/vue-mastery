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
| `bun run check-content` | 检查章节、题目和资源完整性 |
| `bun test` | 运行回归测试 |
| `bun run preview` | 在本地预览已有构建结果 |

## 项目结构

| 路径 | 内容 |
| --- | --- |
| `content/notes/` | 各主题的 Markdown 笔记和配套资源 |
| `content/exercises/` | 实验题目、预期输出与解析 |
| `content/catalog.ts` | 章节信息、分组和顺序 |
| `contracts/` | 内容与存档的数据类型 |
| `src/app/` | 应用布局和章节导航 |
| `src/features/` | 笔记阅读与实验功能 |
| `src/shared/code-playground/` | 共用的编辑器、运行器和输出面板 |
| `tooling/` | Markdown 转换与本地保存服务 |
| `.codex/skills/learning-notes/` | 项目级笔记编写技能 |

技术栈：Vue 3、TypeScript、Vite、Bun。

## 补充学习内容

**修改笔记**：编辑对应主题的 `main.md`。编写规范见 [笔记编写规范](.codex/skills/learning-notes/references/notebook.md)，示例应保持短小，并能独立运行。

**新增笔记**：创建 `content/notes/<主题>/main.md`，然后在 `content/catalog.ts` 中登记章节。

**新增实验**：参考 `content/exercises/promise-event-loop.ts` 定义题目、预期输出与解析，再在 `content/catalog.ts` 中注册专题。

目录分层与依赖约定见 [架构说明](docs/architecture.md)。根目录 `AGENTS.md` 会引导 Codex 在笔记任务中读取项目技能。
