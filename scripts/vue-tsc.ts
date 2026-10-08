import fs from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { plugin } from 'bun'
import { run } from 'vue-tsc'

// vue-tsc 通过拦截 readFileSync 注入 Vue 支持；Bun 默认加载器会绕过此拦截。
plugin({
  name: 'vue-tsc-loader',
  setup(build) {
    build.onLoad({ filter: /[\\/]typescript[\\/]lib[\\/]tsc\.js$/ }, ({ path }) => {
      const module = { exports: {} }
      const execute = new Function(
        'require', 'module', 'exports', '__filename', '__dirname',
        fs.readFileSync(path, 'utf8'),
      )
      execute(createRequire(path), module, module.exports, path, dirname(path))
      return { exports: module.exports, loader: 'object' }
    })
  },
})

run()
