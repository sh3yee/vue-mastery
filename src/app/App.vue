<script setup lang="ts">
import { computed, watch } from 'vue'
import NotePage from '../features/notes/NotePage.vue'
import ExercisePage from '../features/exercises/ExercisePage.vue'
import { chapters, loadChapter } from '../content/repository'
import AppLayout from './AppLayout.vue'
import { useChapterNavigation } from './navigation'
import { useChapterContent } from './useChapterContent'
import { getChapterHref } from '../content/links'

const { currentChapter, currentSection } = useChapterNavigation()
const { chapter, loading, error, reload } = useChapterContent(currentChapter, loadChapter)
const chapterNumber = computed(() => currentChapter.value ? chapters.indexOf(currentChapter.value) + 1 : 0)
const firstChapterHref = chapters[0] ? getChapterHref(chapters[0]) : '#/'

const handleNavigateSection = (section: string) => {
  if (currentChapter.value) window.location.hash = getChapterHref(currentChapter.value, section)
}

watch(currentChapter, (current) => {
  document.title = (current?.title ?? '章节不存在') + ' · JavaScript 学习笔记'
}, { immediate: true })
</script>

<template>
  <AppLayout :current-chapter="currentChapter">
    <div v-if="!currentChapter" class="chapter-status" role="status">
      <p>找不到这个章节。</p>
      <a :href="firstChapterHref">返回首章</a>
    </div>
    <div v-else-if="loading" class="chapter-status" role="status">正在加载章节…</div>
    <div v-else-if="error" class="chapter-status" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="reload">重新加载</button>
    </div>
    <NotePage
      v-if="chapter?.kind === 'note'"
      :key="chapter.id"
      :chapter="chapter"
      :chapter-number="chapterNumber"
      :section="currentSection"
      @navigate-section="handleNavigateSection"
    />
    <!-- 切换到笔记时保留实验会话，专题 ID 保证不同实验互不覆盖。 -->
    <KeepAlive>
      <ExercisePage v-if="chapter?.kind === 'lab'" :key="chapter.id" :topic="chapter.topic" embedded />
    </KeepAlive>
  </AppLayout>
</template>

<style scoped>
.chapter-status { padding: 32px; line-height: 1.7; }
</style>
