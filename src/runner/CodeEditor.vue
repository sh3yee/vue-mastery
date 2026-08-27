<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  modelValue: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  run: []
}>()

const textarea = ref<HTMLTextAreaElement | null>(null)
// 本地副本，避免 v-model 与手动 DOM 操作相互打架
const text = ref(props.modelValue)

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
  <textarea
    ref="textarea"
    class="code-editor"
    v-model="text"
    spellcheck="false"
    autocomplete="off"
    autocapitalize="off"
    @keydown="onKeyDown"
  ></textarea>
</template>

<style scoped>
.code-editor {
  box-sizing: border-box;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 260px;
  padding: 12px 14px;
  border: none;
  outline: none;
  resize: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  tab-size: 2;
  background: #1e1e1e;
  color: #d4d4d4;
}
</style>
