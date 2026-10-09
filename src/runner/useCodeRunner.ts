import { ref, shallowRef, onBeforeUnmount, onDeactivated } from 'vue'
import { workerSource } from './workerSource'

export type LogLevel = 'log' | 'info' | 'warn' | 'error'

export interface OutputLine {
  level: LogLevel
  text: string
}

// Worker → 主线程 的消息协议
type WorkerMessage =
  | { type: 'ready' }
  | { type: 'log'; level: LogLevel; text: string }
  | { type: 'done' }

const HARD_TIMEOUT = 5200 // 略晚于 Worker 自身的 5s 硬上限，作为主线程兜底
const MAX_OUTPUT_LINES = 500

/**
 * 代码运行器：每次运行新建一个 Web Worker（全新全局作用域），
 * 用「静默期」判定异步输出结束。完成后保留 Worker 以接收迟到的输出。
 */
export function useCodeRunner() {
  const output = ref<OutputLine[]>([])
  const isRunning = ref(false)

  // Worker 与 Blob URL 不是响应式数据，用 shallowRef 手动管理
  const worker = shallowRef<Worker | null>(null)
  const hardTimer = shallowRef<ReturnType<typeof setTimeout> | null>(null)
  let blobUrl: string | null = null

  function clearHardTimer() {
    if (hardTimer.value) {
      clearTimeout(hardTimer.value)
      hardTimer.value = null
    }
  }

  function terminateWorker() {
    clearHardTimer()
    const w = worker.value
    if (w) {
      w.terminate()
      worker.value = null
    }
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      blobUrl = null
    }
  }

  function handleMessage(msg: MessageEvent) {
    const data = msg.data as WorkerMessage | null
    if (!data || typeof data !== 'object') return
    switch (data.type) {
      case 'log':
        if (!['log', 'info', 'warn', 'error'].includes(data.level) || typeof data.text !== 'string') return
        // 完成后仍可能收到迟到输出，一律追加
        output.value.push({ level: data.level, text: data.text.slice(0, 20000) })
        if (output.value.length >= MAX_OUTPUT_LINES) {
          output.value.push({ level: 'warn', text: '输出达到 500 条，已停止运行。' })
          stop()
        }
        break
      case 'done':
        isRunning.value = false
        break
      case 'ready':
        break
    }
  }

  function runCode(code: string) {
    // 上一轮的 Worker 一次性清理：终止旧线程、撤销旧 URL，确保全新作用域
    terminateWorker()
    output.value = []
    isRunning.value = true

    const blob = new Blob([workerSource], { type: 'application/javascript' })
    blobUrl = URL.createObjectURL(blob)
    let w: Worker
    try {
      w = new Worker(blobUrl)
    } catch (error) {
      output.value.push({ level: 'error', text: error instanceof Error ? error.message : 'Worker 创建失败' })
      stop()
      return
    }
    worker.value = w
    w.addEventListener('message', (event) => {
      if (worker.value === w) handleMessage(event)
    })
    w.addEventListener('error', (e) => {
      if (worker.value !== w) return
      output.value.push({ level: 'error', text: e.message || 'Worker 加载失败' })
      stop()
    })

    // 静默结束后仍可能有定时器；到达上限时也必须回收线程。
    hardTimer.value = setTimeout(() => {
      if (isRunning.value) {
        output.value.push({ level: 'error', text: '⚠ 运行超时，已强制停止。' })
      }
      stop()
    }, HARD_TIMEOUT)

    // 立即投递代码；浏览器会等 Worker 设置好 onmessage 后再送达
    w.postMessage({ type: 'run', code })
  }

  function stop() {
    terminateWorker()
    isRunning.value = false
  }

  function clear() {
    output.value = []
  }

  // 实验章节被缓存时停止后台 Worker，保留编辑器和已有输出。
  onDeactivated(stop)

  onBeforeUnmount(() => {
    terminateWorker()
  })

  return { output, isRunning, runCode, stop, clear }
}
