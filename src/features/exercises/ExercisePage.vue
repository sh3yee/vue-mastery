<script setup lang="ts">
import { computed } from 'vue'
import type { Topic } from '../../../contracts/content'
import CodeEditor from '../../shared/code-playground/CodeEditor.vue'
import OutputPanel from '../../shared/code-playground/OutputPanel.vue'
import { useExerciseSession } from './useExerciseSession'

const props = defineProps<{ topic: Topic; availableTopics?: Topic[]; embedded?: boolean }>()
const emit = defineEmits<{ 'update:topicId': [id: string] }>()
const { output, isRunning, stop, code, currentId, showAnswer, grouped, currentQuestion, hasSavedEdit, isModified, loadQuestion, handleRun, handleReset, saveStatus } = useExerciseSession(() => props.topic)
const topicIdModel = computed({ get: () => props.topic.id, set: (id: string) => emit('update:topicId', id) })
</script>

<template>
  <div class="page" :class="{ embedded }">
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
              <span v-if="hasSavedEdit(q)" class="dot" title="本题有改动">●</span>
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
              <span v-if="isModified" class="badge">已编辑</span>
            </template>
            <template v-else>未选择题目</template>
          </div>
          <div class="toolbar-actions">
            <button class="btn primary" :disabled="isRunning" @click="handleRun">运行</button>
            <button class="btn" :disabled="!isRunning" @click="stop">停止</button>
            <button class="btn" @click="handleReset">重置</button>
            <button class="btn" @click="showAnswer = !showAnswer">
              {{ showAnswer ? '隐藏答案' : '显示答案' }}
            </button>
          </div>
        </div>

        <div v-if="saveStatus" class="save-status">
          <span>{{ saveStatus }}</span>
        </div>

        <div class="panes">
          <section class="pane editor-pane">
            <div class="pane-label">
              代码 <span class="hint">Ctrl / Cmd + Enter 运行</span>
            </div>
            <CodeEditor v-model="code" @run="handleRun" />
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
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f7f8;
  color: #1f2328;
}
.page.embedded {
  height: 100%;
}
.embedded .sidebar {
  width: 240px;
  flex-basis: 240px;
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
.q-title {
  flex: 1;
  min-width: 0;
}
.dot {
  flex: 0 0 auto;
  font-size: 8px;
  color: #f59e0b;
  line-height: 1;
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
  flex: 1;
  min-width: 0;
}
.badge {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 4px;
  background: #fef3c7;
  color: #b45309;
  font-size: 11px;
  font-weight: 500;
}
.toolbar-actions {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
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

.save-status {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #f3f4f6;
  font-size: 12px;
  color: #6b7280;
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

@media (max-width: 880px) {
  .panes {
    flex-direction: column;
  }
  .sidebar {
    flex: 0 0 220px;
    width: 220px;
  }
  .embedded .sidebar {
    flex-basis: 180px;
    width: 180px;
  }
  .main {
    overflow-y: auto;
  }
  .panes {
    flex: 0 0 auto;
    min-height: 620px;
  }
  .pane {
    min-height: 300px;
  }
  .toolbar {
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .body {
    flex-direction: column;
  }
  .sidebar, .embedded .sidebar {
    width: 100%;
    flex: 0 0 140px;
    border-right: 0;
    border-bottom: 1px solid #e5e5e7;
  }
  .page-header {
    padding: 12px 16px;
  }
  .page-header h1 {
    font-size: 16px;
  }
  .page-header p {
    font-size: 12px;
  }
  .toolbar-actions {
    gap: 6px;
  }
  .btn {
    padding: 6px 10px;
  }
}
</style>
