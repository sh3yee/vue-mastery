# Vue Mastery

Vue 3 + TypeScript + Vite 学习项目，使用 Bun 管理依赖并执行开发、类型检查和构建命令。

需要 Bun 1.4.2 或更新版本，安装方式见 [Bun 官方文档](https://bun.sh/docs/installation)。
`bunfig.toml` 强制脚本使用 Bun 运行时和 Bun Shell。

## 网页笔记

- 左侧按基础概念、函数与应用、异步与调度分组，点击章节阅读现有的 9 篇笔记。
- 正文支持 JavaScript / TypeScript / JSON 语法高亮、代码复制、表格、折叠答案；本章目录可跳转到小节，地址可分享、刷新和前进后退。
- “动手实验”章节保留选题、代码运行、答案与自动保存；切到笔记后再返回会保留编辑状态。
- 手机端通过顶部菜单打开章节导航，正文上方可展开本章目录。

继续编辑 `src/<主题>/main.md` 即可更新网页内容。新增笔记时在
`src/notes/chapters.ts` 的 `noteDefinitions` 中添加章节信息；实验专题仍在 `src/topics/index.ts` 注册。
Markdown 由 `notes-plugin.ts` 使用 Bun 内置解析器转换成网页，无需新增渲染依赖。

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```powershell
bun install --frozen-lockfile
```

依赖版本统一由 `bun.lock` 管理，请将它提交到 Git。更新依赖后使用 `bun install` 同步锁文件。
`node_modules` 是 Bun 使用的依赖目录；Bun 类型和 Vite 内部仍包含兼容类型，
编辑持久化使用 Bun 支持的 `node:fs` API 保留原子写入，无需单独安装 Node.js。

### Compile and Hot-Reload for Development

```powershell
bun run dev
```

### Type-Check, Compile and Minify for Production

```powershell
bun run build
```

构建先执行 Vue 类型检查，通过后再打包；构建失败会返回非零退出码。

### Type-Check Only

```powershell
bun run type-check
```

### Build Only

```powershell
bun run build-only
```

向 Vite 传递构建参数时，使用 `bun run build-only --base=/your-path/`。

### Preview Production Build

```powershell
bun run preview
```
