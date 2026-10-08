# Vue Mastery

Vue 3 + TypeScript + Vite 学习项目，使用 Bun 管理依赖并执行开发、类型检查和构建命令。

需要 Bun 1.4.2 或更新版本，安装方式见 [Bun 官方文档](https://bun.sh/docs/installation)。
`bunfig.toml` 强制脚本使用 Bun 运行时和 Bun Shell。

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
