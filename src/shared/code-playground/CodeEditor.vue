<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

const props = defineProps<{
  modelValue: string
  ariaLabel?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  run: []
}>()

const textarea = ref<HTMLTextAreaElement | null>(null)
const gutter = ref<HTMLElement | null>(null)
// 本地副本，避免 v-model 与手动 DOM 操作相互打架
const text = ref(props.modelValue)
const lineCount = computed(() => text.value.split('\n').length)

const handleScroll = () => {
  if (gutter.value && textarea.value) gutter.value.scrollTop = textarea.value.scrollTop
}

watch(
  () => props.modelValue,
  (v) => {
    if (v !== text.value) text.value = v
  },
)

watch(text, (v) => {
  if (v !== props.modelValue) emit('update:modelValue', v)
})

function onKeyDown(e: KeyboardEvent) {
  // Ctrl/Cmd + Enter 运行
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    emit('run')
    return
  }

  if (e.key !== 'Tab') return
  e.preventDefault()
  const el = textarea.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const value = text.value

  if (e.shiftKey) {
    // 反缩进：删掉光标所在行行首的一个制表符或最多两个空格
    const before = value.slice(0, start)
    const lineStart = before.lastIndexOf('\n') + 1
    const segment = value.slice(lineStart)
    const match = segment.match(/^(\t| {1,2})/)
    if (!match || match[1] === undefined) return
    const removeLen = match[1].length
    text.value = value.slice(0, lineStart) + segment.slice(removeLen)
    void nextTick(() => {
      const delta = Math.max(0, start - lineStart - removeLen)
      el.selectionStart = el.selectionEnd = lineStart + delta
      el.focus()
    })
  } else {
    // 插入两个空格
    text.value = value.slice(0, start) + '  ' + value.slice(end)
    void nextTick(() => {
      el.selectionStart = el.selectionEnd = start + 2
      el.focus()
    })
  }
}
</script>

<template>
  <div class="code-editor">
    <div ref="gutter" class="editor-gutter" aria-hidden="true">
      <div v-for="line in lineCount" :key="line">{{ line }}</div>
    </div>
    <textarea
    ref="textarea"
    class="editor-input"
    v-model="text"
    :aria-label="props.ariaLabel ?? '代码编辑器'"
    wrap="off"
    spellcheck="false"
    autocomplete="off"
    autocapitalize="off"
    @keydown="onKeyDown"
    @scroll="handleScroll"
  ></textarea>
  </div>
</template>

<style scoped>
.code-editor {
  display: flex;
  box-sizing: border-box;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 260px;
  min-width: 0;
  overflow: hidden;
  background: var(--editor-background, #1e1e1e);
  box-shadow: inset 3px 0 transparent;
  transition: box-shadow .15s ease;
}

.code-editor:focus-within { box-shadow: inset 3px 0 var(--editor-focus, #737d8c); }

.editor-input, .editor-gutter {
  box-sizing: border-box;
  margin: 0;
  padding-top: 18px;
  padding-bottom: 18px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 22px;
  tab-size: 2;
}

.editor-gutter {
  flex: 0 0 auto;
  min-width: 48px;
  padding-left: 14px;
  padding-right: 12px;
  overflow: hidden;
  text-align: right;
  color: var(--editor-muted, #686d76);
  user-select: none;
}

.editor-input {
  display: block;
  flex: 1;
  width: 0;
  min-width: 0;
  height: 100%;
  padding-left: 6px;
  padding-right: 20px;
  border: none;
  border-radius: 0;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--editor-foreground, #d8dee9);
  caret-color: var(--editor-foreground, #e5e7eb);
  scrollbar-width: thin;
  scrollbar-color: var(--editor-scrollbar, #454a53) transparent;
}

.editor-input::selection { background: var(--editor-selection, #414d62); }
</style>
