<script setup lang="ts">
import { computed, ref } from 'vue'
import PlaygroundPage from './runner/PlaygroundPage.vue'
import { topics } from './topics'
import type { Topic } from './runner/types'

// 当前激活的专题 id。新增专题后这里不用改，只在 src/topics/index.ts 注册就行。
const currentId = ref<string>(topics[0]?.id ?? '')

const currentTopic = computed<Topic | undefined>(() =>
  topics.find((t) => t.id === currentId.value),
)

function onTopicChange(id: string) {
  currentId.value = id
}
</script>

<template>
  <PlaygroundPage
    v-if="currentTopic"
    :topic="currentTopic"
    :available-topics="topics"
    @update:topic-id="onTopicChange"
  />
</template>