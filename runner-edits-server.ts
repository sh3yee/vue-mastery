import { writeFileSync, renameSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

// 编辑持久化的 dev 后端：让浏览器把编辑器改动直接写进 public/runner-edits.json，
// 随仓库 git 同步到其他设备。只在 npm run dev 下挂载（configureServer）；
// preview / 部署不挂，客户端探测到不可写会静默降级为只读。

const FILE = fileURLToPath(new URL('./public/runner-edits.json', import.meta.url))
const TMP = `${FILE}.tmp`
const ENDPOINT = '/__runner-edits'

export function runnerEditsPlugin(): Plugin {
  return {
    name: 'runner-edits-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if ((req.url ?? '').split('?')[0] !== ENDPOINT) return next()
        res.setHeader('content-type', 'application/json')

        // GET：健康探测，客户端用它判断“是否在 dev 环境”
        if (req.method === 'GET') {
          res.statusCode = 200
          res.end('{"ok":true}')
          return
        }

        // POST：写盘
        if (req.method === 'POST') {
          try {
            const chunks: Buffer[] = []
            for await (const c of req) chunks.push(c as Buffer)
            const text = Buffer.concat(chunks).toString('utf8')
            JSON.parse(text) // 坏 JSON 在此抛错
            // 原子写：先写 tmp 再 rename，避免中途崩溃留下半截脏文件
            writeFileSync(TMP, text, 'utf8')
            renameSync(TMP, FILE)
            res.statusCode = 200
            res.end('{"ok":true}')
          } catch (e) {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
          return
        }

        next()
      })
    },
  }
}
