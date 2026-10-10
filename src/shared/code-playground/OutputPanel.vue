<script setup lang="ts">
import type { OutputLine } from './useCodeRunner'

defineProps<{
  lines: OutputLine[]
  running: boolean
}>()
</script>

<template>
  <div class="output-panel">
    <div v-if="lines.length === 0 && !running" class="output-empty">
      点击「运行」查看输出结果
    </div>
    <div v-else class="output-lines">
      <div
        v-for="(line, i) in lines"
        :key="i"
        class="output-line"
        :class="line.level"
      >{{ line.text }}</div>
      <div v-if="running" class="output-running">▍运行中…</div>
    </div>
  </div>
</template>

<style scoped>
.output-panel {
  box-sizing: border-box;
  flex: 1;
  min-height: 240px;
  overflow: auto;
  padding: 12px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  background: var(--output-background, #0f0f10);
  color: var(--output-foreground, #e6e6e6);
}

.output-empty {
  color: var(--output-muted, #888);
}

.output-running {
  color: var(--output-muted, #888);
}

.output-line.error {
  color: var(--output-error, #ff6b6b);
}

.output-line.warn {
  color: var(--output-warn, #ffd166);
}

.output-line.info {
  color: var(--output-info, #8dd0ff);
}
</style>
