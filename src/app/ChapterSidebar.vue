<script setup lang="ts">
import type { ChapterDefinition } from '../../contracts/content'
import { chapters, chapterGroups } from '../content/repository'
import { getChapterHref } from '../content/links'

defineProps<{ currentChapter: ChapterDefinition | null }>()
defineEmits<{ navigate: [] }>()
</script>

<template>
        <nav class="chapter-navigation" aria-label="学习章节">
          <section v-for="group in chapterGroups" :key="group.name" class="chapter-group">
            <h2>{{ group.name }}</h2>
            <a
              v-for="chapter in group.chapters"
              :key="`${chapter.kind}-${chapter.id}`"
              class="chapter-link"
              :class="{ active: chapter === currentChapter }"
              :href="getChapterHref(chapter)"
              :aria-current="chapter === currentChapter ? 'page' : undefined"
              @click="$emit('navigate')"
            >
              <span class="chapter-number">{{ String(chapters.indexOf(chapter) + 1).padStart(2, '0') }}</span>
              <span class="chapter-title">{{ chapter.title }}</span>
              <svg v-if="chapter.kind === 'lab'" class="lab-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3h6M10 3v6l-6 10a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M7 15h10" />
              </svg>
            </a>
          </section>
        </nav>

</template>

<style scoped>
.chapter-navigation {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 10px 18px;
}

.chapter-group {
  margin-bottom: 20px;
}

.chapter-group:last-child {
  margin-bottom: 0;
}

.chapter-group h2 {
  margin: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.chapter-link {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 10px;
  border-radius: 6px;
  color: #374151;
  font-size: 13px;
  text-decoration: none;
  line-height: 1.55;
  transition: background .15s;
}

.chapter-link:hover {
  background: #f3f4f6;
}

.chapter-link.active {
  color: #2563eb;
  background: #eef2ff;
  font-weight: 550;
}

.chapter-number {
  flex-shrink: 0;
  color: #9ca3af;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.chapter-link.active .chapter-number {
  color: #60a5fa;
}

.chapter-title {
  flex: 1;
  min-width: 0;
}

.lab-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  align-self: center;
}

svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
