<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CodeEditor from '../runner/CodeEditor.vue'
import OutputPanel from '../runner/OutputPanel.vue'
import { useCodeRunner } from '../runner/useCodeRunner'
import type { LogLevel } from '../runner/useCodeRunner'
import { createHtmlPreview } from '../runner/htmlPreview'

const LANGUAGE_LABELS: Record<string, string> = { js: 'JavaScript', javascript: 'JavaScript', html: 'HTML', text: 'Text', ts: 'TypeScript', typescript: 'TypeScript' }

const props = defineProps<{ source: string; highlighted: string; language: string }>()

const code = ref(props.source)
const editing = ref(false)
const hasRun = ref(false)
const copyStatus = ref('')
const preview = ref<HTMLIFrameElement | null>(null)
const previewDocument = ref('')
const previewVersion = ref(0)
const { output, isRunning, runCode, stop, clear } = useCodeRunner()

const editorHeight = computed(() => `${Math.min(520, Math.max(160, code.value.split('\n').length * 22 + 36))}px`)
const isHtml = computed(() => props.language.toLowerCase() === 'html')
const languageLabel = computed(() => LANGUAGE_LABELS[props.language.toLowerCase()] ?? props.language)

const handleRun = () => {
  hasRun.value = true
  if (isHtml.value) {
    clear()
    previewDocument.value = createHtmlPreview(code.value)
    previewVersion.value += 1
    return
  }
  runCode(code.value)
}

const handleReset = () => {
  stop()
  clear()
  code.value = props.source
  editing.value = false
  hasRun.value = false
  copyStatus.value = ''
  previewDocument.value = ''
}

const handlePreviewMessage = (event: MessageEvent) => {
  if (!preview.value || event.source !== preview.value.contentWindow) return
  const data = event.data
  if (!data || data.type !== 'note-preview-log' || typeof data.text !== 'string') return
  if (!['log', 'info', 'warn', 'error'].includes(data.level) || output.value.length >= 500) return
  output.value.push({ level: data.level as LogLevel, text: data.text.slice(0, 20000) })
}

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(code.value)
    copyStatus.value = '已复制'
  } catch {
    copyStatus.value = '复制失败，请手动复制'
  }
}

onMounted(() => window.addEventListener('message', handlePreviewMessage))
onBeforeUnmount(() => window.removeEventListener('message', handlePreviewMessage))
</script>

<template>
  <div class="runnable-code">
    <div class="code-toolbar">
      <span class="code-language"><span class="language-symbol" aria-hidden="true">&lt;/&gt;</span>{{ languageLabel }}</span>
      <button type="button" class="copy-button" aria-label="复制代码" title="复制代码" @click="handleCopy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>
      </button>
      <button type="button" :aria-pressed="editing" @click="editing = !editing">{{ editing ? '收起编辑' : '编辑' }}</button>
      <button type="button" @click="handleReset">重置</button>
      <button v-if="isRunning" type="button" @click="stop">停止</button>
      <button type="button" class="run-button" @click="handleRun"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5a.7.7 0 0 1 1.05-.6l10 6a1.3 1.3 0 0 1 0 2.2l-10 6A.7.7 0 0 1 8 18.5z" /></svg>{{ isRunning ? '重新运行' : '运行' }}</button>
    </div>
    <span v-if="copyStatus" class="copy-status" role="status">{{ copyStatus }}</span>
    <CodeEditor v-if="editing" v-model="code" class="inline-editor" :style="{ height: editorHeight }" aria-label="编辑示例代码" @run="handleRun" />
    <pre v-else-if="code === source"><code v-html="highlighted" /></pre>
    <pre v-else><code>{{ code }}</code></pre>
    <div v-if="editing" class="editor-status"><span>正在编辑</span><span>Tab 缩进 · Ctrl / ⌘ + Enter 运行</span></div>
    <section v-if="hasRun" class="code-result" aria-label="运行结果">
      <div class="result-heading"><span class="result-label"><span class="result-dot" :class="{ running: isRunning }" />输出</span><span>{{ isRunning ? '运行中…' : '运行结果' }}</span></div>
      <iframe v-if="isHtml" :key="previewVersion" ref="preview" :srcdoc="previewDocument" sandbox="allow-scripts" title="HTML 示例预览" class="html-preview" />
      <OutputPanel v-if="output.length || isRunning" :lines="output" :running="isRunning" />
      <div v-else class="no-output" role="status">本次暂无输出，可用 console.log() 查看结果。</div>
    </section>
  </div>
</template>

<style scoped>
.runnable-code {
  --editor-background: #f8fafc;
  --editor-foreground: #334155;
  --editor-muted: #6e7781;
  --editor-focus: #cbd5e1;
  --editor-scrollbar: #afb8c1;
  --editor-selection: #ddf4ff;
  --output-background: #fff;
  --output-foreground: #24292f;
  --output-muted: #57606a;
  --output-error: #cf222e;
  --output-warn: #9a6700;
  --output-info: #0969da;
  color-scheme: light;
  background: #f8fafc;
  color: #334155;
}
.code-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 18px;
  background: #fff;
  border-bottom: 1px solid #eef1f5;
}
.code-language { display: inline-flex; align-items: center; gap: 10px; margin-right: auto; color: #475569; font-size: 12px; font-weight: 500; }
.language-symbol { color: #94a3b8; font-family: ui-monospace, monospace; font-size: 14px; }
.code-toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: 7px;
  color: #64748b;
  background: transparent;
  font-size: 12px;
  cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.code-toolbar svg { width: 15px; height: 15px; }
.code-toolbar .copy-button { padding: 6px; }
.code-toolbar button:hover { background: #f1f5f9; color: #334155; }
.code-toolbar button[aria-pressed='true'] { background: #eef2f6; color: #334155; }
.code-toolbar button:focus-visible { outline: 2px solid #8c959f; outline-offset: 2px; }
.code-toolbar .run-button { margin-left: 6px; background: #eef2ff; color: #4f46a5; }
.code-toolbar .run-button:hover { background: #e0e7ff; color: #43388d; }
.runnable-code pre { padding: 22px 24px; }
.inline-editor { min-height: 160px; }
.editor-status { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 9px 20px; border-top: 1px solid #eef1f5; background: #f8fafc; color: #64748b; font-size: 11px; line-height: 1.5; }
.copy-status { display: block; padding: 4px 12px; color: #57606a; font-size: 12px; }
.code-result { border-top: 1px solid #e8edf3; background: #fff; }
.result-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 22px 0; color: #64748b; font-size: 11px; }
.result-label { display: inline-flex; align-items: center; gap: 7px; color: #475569; font-weight: 500; }
.result-dot { width: 5px; height: 5px; border-radius: 50%; background: #94a3b8; }
.result-dot.running { background: #818cf8; }
.code-result :deep(.output-panel) { min-height: 0; max-height: 300px; padding: 12px 22px 20px; }
.code-result :deep(.output-line) { white-space: pre-wrap; overflow-wrap: anywhere; }
.no-output { padding: 12px 22px 20px; color: #64748b; background: #fff; font-size: 12px; }
.html-preview { display: block; width: 100%; min-height: 160px; border: 0; background: #fff; }
</style>
