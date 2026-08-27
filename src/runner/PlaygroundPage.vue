<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import CodeEditor from './CodeEditor.vue'
import OutputPanel from './OutputPanel.vue'
import { useCodeRunner } from './useCodeRunner'
import type { Question, Topic } from './types'

const props = defineProps<{
  topic: Topic
  // 可选：传入多个专题时，页面头部出现切换器；只有一个专题时不显示
  availableTopics?: Topic[]
}>()

const emit = defineEmits<{
  'update:topicId': [id: string]
}>()

const { output, isRunning, runCode, stop, clear } = useCodeRunner()

const code = ref('')
const currentId = ref<number | null>(null)
const showAnswer = ref(false)

// 按 Question.group 分组，用于侧边栏展示
const grouped = computed(() => {
  const m = new Map<string, Question[]>()
  for (const q of props.topic.questions) {
    const list = m.get(q.group)
    if (list) list.push(q)
    else m.set(q.group, [q])
  }
  return [...m.entries()].map(([group, items]) => ({ group, items }))
})

const currentQuestion = computed(() => {
  const id = currentId.value
  if (id === null) return null
  return props.topic.questions.find((q) => q.id === id) ?? null
})

// 专题切换器用的 v-model：写入时通过事件抛给上层
const topicIdModel = computed({
  get: () => props.topic.id,
  set: (v: string) => emit('update:topicId', v),
})

function loadQuestion(q: Question) {
  code.value = q.code
  currentId.value = q.id
  showAnswer.value = false
  clear()
}

function onRun() {
  runCode(code.value)
}

function onReset() {
  const q = currentQuestion.value
  if (q) code.value = q.code
}

// 初次进入：载入专题的第一题
onMounted(() => {
  const first = props.topic.questions[0]
  if (first) loadQuestion(first)
})

// 切换专题时：重置为新专题的第一题
watch(
  () => props.topic.id,
  () => {
    const first = props.topic.questions[0]
    if (first) loadQuestion(first)
  },
)
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div class="header-text">
        <h1>{{ topic.name }}</h1>
        <p v-if="topic.description">{{ topic.description }}</p>
      </div>
      <select
        v-if="availableTopics && availableTopics.length > 1"
        v-model="topicIdModel"
        class="topic-switcher"
      >
        <option v-for="t in availableTopics" :key="t.id" :value="t.id">
          {{ t.name }}
        </option>
      </select>
    </header>

    <div class="body">
      <aside class="sidebar">
        <div class="sidebar-inner">
          <div v-for="g in grouped" :key="g.group" class="group">
            <div class="group-title">{{ g.group }}</div>
            <button
              v-for="q in g.items"
              :key="q.id"
              class="q-item"
              :class="{ active: q.id === currentId }"
              @click="loadQuestion(q)"
            >
              <span class="q-id">{{ q.id }}</span>
              <span class="q-title">{{ q.title }}</span>
            </button>
          </div>
        </div>
      </aside>

      <main class="main">
        <div class="toolbar">
          <div class="current-title">
            <template v-if="currentQuestion">
              <span class="q-id">{{ currentQuestion.id }}</span>
              {{ currentQuestion.title }}
            </template>
            <template v-else>未选择题目</template>
          </div>
          <div class="toolbar-actions">
            <button class="btn primary" :disabled="isRunning" @click="onRun">运行</button>
            <button class="btn" :disabled="!isRunning" @click="stop">停止</button>
            <button class="btn" @click="onReset">重置</button>
            <button class="btn" @click="showAnswer = !showAnswer">
              {{ showAnswer ? '隐藏答案' : '显示答案' }}
            </button>
          </div>
        </div>

        <div class="panes">
          <section class="pane editor-pane">
            <div class="pane-label">
              代码 <span class="hint">Ctrl / Cmd + Enter 运行</span>
            </div>
            <CodeEditor v-model="code" @run="onRun" />
          </section>

          <section class="pane output-pane">
            <div class="pane-label">输出</div>
            <OutputPanel :lines="output" :running="isRunning" />
          </section>
        </div>

        <section v-if="showAnswer && currentQuestion" class="answer">
          <div class="answer-block">
            <div class="answer-label">预期输出</div>
            <pre class="expected">{{ currentQuestion.expected }}</pre>
          </div>
          <div class="answer-block">
            <div class="answer-label">解析</div>
            <p class="explanation">{{ currentQuestion.explanation }}</p>
          </div>
        </section>
      </main>
    </div>

    <footer class="page-footer">
      运行环境为浏览器 Web Worker，不支持 DOM（document/window）；顶层 await 需写在 async 函数内。长时间运行或死循环会在 5 秒后自动终止。
    </footer>
  </div>
</template>

<style>
/* 整页填满视口，关闭窗口滚动条；只有侧边栏等指定容器保留内部滚动 */
html,
body {
  margin: 0;
  height: 100%;
  overflow: hidden;
}

#app {
  height: 100%;
}
</style>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f7f8;
  color: #1f2328;
}

.page-header {
  padding: 14px 20px;
  border-bottom: 1px solid #e5e5e7;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.header-text {
  min-width: 0;
}
.page-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.page-header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}
.topic-switcher {
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #1f2328;
}

.body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.sidebar {
  width: 280px;
  flex: 0 0 280px;
  border-right: 1px solid #e5e5e7;
  background: #fff;
  overflow: auto;
}
.sidebar-inner {
  padding: 10px 8px;
}
.group {
  margin-bottom: 12px;
}
.group-title {
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}
.q-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: #1f2328;
}
.q-item:hover {
  background: #f0f0f1;
}
.q-item.active {
  background: #eef2ff;
  color: #2563eb;
  font-weight: 500;
}
.q-id {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
  color: #9ca3af;
}
.q-item.active .q-id {
  color: #60a5fa;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
}
.current-title {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.toolbar-actions {
  display: flex;
  gap: 8px;
}
.btn {
  padding: 6px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  color: #1f2328;
}
.btn:hover:not(:disabled) {
  background: #f3f4f6;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.btn.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.panes {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}
.pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  overflow: hidden;
  min-height: 0;
}
.pane-label {
  flex: 0 0 auto;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  background: #fafafa;
  border-bottom: 1px solid #e5e5e7;
}
.hint {
  font-weight: 400;
  color: #9ca3af;
}
.editor-pane {
  background: #1e1e1e;
}
.output-pane {
  background: #0f0f10;
}

.answer {
  flex: 0 0 auto;
  max-height: 38%;
  overflow: auto;
  padding: 12px 14px;
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  background: #fff;
}
.answer-block {
  margin-bottom: 10px;
}
.answer-block:last-child {
  margin-bottom: 0;
}
.answer-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
}
.expected {
  margin: 0;
  padding: 8px 10px;
  background: #0f0f10;
  color: #e6e6e6;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
  overflow-x: auto;
}
.explanation {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #1f2328;
}

.page-footer {
  flex: 0 0 auto;
  padding: 8px 20px;
  border-top: 1px solid #e5e5e7;
  background: #fff;
  font-size: 12px;
  color: #9ca3af;
}

@media (max-width: 880px) {
  .panes {
    flex-direction: column;
  }
  .sidebar {
    flex: 0 0 220px;
    width: 220px;
  }
}
</style>