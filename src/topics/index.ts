import type { Topic } from '../runner/types'
import { promiseEventLoopTopic } from './promise-event-loop'

// 专题注册表：以后新增专题，在这里加一行即可。
// 新专题：在 src/topics/<专题名>/index.ts 里导出一个 Topic 对象，再 import 到这里。
export const topics: Topic[] = [promiseEventLoopTopic]

export function getTopic(id: string): Topic | undefined {
  return topics.find((t) => t.id === id)
}