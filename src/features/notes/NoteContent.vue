<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import NoteCodeBlock from './NoteCodeBlock.vue'

defineProps<{ html: string }>()

const content = ref<HTMLElement | null>(null)
const blocks = shallowRef<{ target: HTMLElement; code: string; highlighted: string; language: string }[]>([])

onMounted(() => {
  // Markdown 保留完整的标题、列表和折叠结构，仅将代码块替换为交互组件。
  blocks.value = Array.from(content.value?.querySelectorAll<HTMLElement>('.note-code-block') ?? []).flatMap((target) => {
    const code = target.querySelector('pre code')
    if (!code) return []
    const block = {
      target,
      code: code.textContent ?? '',
      highlighted: code.innerHTML,
      language: code.className.replace('language-', '') || 'javascript',
    }
    target.replaceChildren()
    return [block]
  })
})
</script>

<template>
  <div ref="content" v-html="html" />
  <Teleport v-for="(block, index) in blocks" :key="index" :to="block.target">
    <NoteCodeBlock :source="block.code" :highlighted="block.highlighted" :language="block.language" />
  </Teleport>
</template>
