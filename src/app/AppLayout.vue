<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ChapterDefinition } from '../../contracts/content'
import { chapters } from '../content/repository'
import ChapterSidebar from './ChapterSidebar.vue'

const props = defineProps<{ currentChapter: ChapterDefinition | null }>()
const noteCount = chapters.filter((chapter) => chapter.kind === 'note').length
const labCount = chapters.length - noteCount
const navigationOpen = ref(false)
watch(() => props.currentChapter, () => { navigationOpen.value = false })
</script>

<template>
  <div class="learning-app">
    <header class="app-header">
      <button
        class="navigation-toggle"
        type="button"
        aria-label="切换章节导航"
        aria-controls="chapter-navigation"
        :aria-expanded="navigationOpen"
        @click="navigationOpen = !navigationOpen"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <div class="app-heading">
        <h1>JavaScript 学习笔记</h1>
      </div>
      <span class="chapter-count">{{ noteCount }} 篇笔记 <span>·</span> {{ labCount }} 个实验</span>
    </header>

    <div class="learning-body">
      <button
        v-if="navigationOpen"
        class="navigation-backdrop"
        type="button"
        aria-label="关闭章节导航"
        @click="navigationOpen = false"
      />
      <aside id="chapter-navigation" class="chapter-sidebar" :class="{ open: navigationOpen }">
        <div class="navigation-heading">章节目录 <span>{{ chapters.length }}</span></div>
        <ChapterSidebar :current-chapter="currentChapter" @navigate="navigationOpen = false" />
      </aside>

      <div class="chapter-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.learning-app {
  height: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 22px;
  background: #fff;
  border-bottom: 1px solid #e5e5e7;
  flex: 0 0 auto;
}

.app-heading {
  min-width: 0;
  flex: 1;
}

.app-heading h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -.4px;
}

.chapter-count {
  flex-shrink: 0;
  font-size: 12px;
  color: #6b7280;
}

.chapter-count span {
  margin: 0 5px;
  color: #c0c5ce;
}

.learning-body {
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
}

.chapter-sidebar {
  display: flex;
  flex-direction: column;
  width: 254px;
  flex: 0 0 254px;
  border-right: 1px solid #e5e5e7;
  background: #fff;
  min-height: 0;
}

.navigation-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 12px;
  font-size: 13px;
  font-weight: 600;
}

.navigation-heading span {
  font-size: 11px;
  font-weight: 400;
  color: #9ca3af;
}

svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chapter-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.navigation-toggle,
.navigation-backdrop {
  display: none;
}

@media (max-width: 720px) {
  .app-header {
    padding: 13px 16px;
    gap: 12px;
  }

  .app-heading h1 {
    font-size: 17px;
  }

  .app-heading p {
    font-size: 11px;
  }

  .chapter-count {
    display: none;
  }

  .navigation-toggle {
    display: grid;
    place-items: center;
    padding: 7px;
    background: #fff;
    color: #374151;
    border: 1px solid #e5e5e7;
    border-radius: 6px;
    cursor: pointer;
  }

  .navigation-toggle svg {
    width: 18px;
    height: 18px;
  }

  .chapter-sidebar {
    display: none;
  }

  .chapter-sidebar.open {
    display: flex;
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 20;
    box-shadow: 10px 0 30px #1f232820;
  }

  .navigation-backdrop {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 10;
    border: 0;
    background: #11182740;
  }
}
</style>
