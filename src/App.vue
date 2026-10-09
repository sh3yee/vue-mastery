<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import NotePage from './notes/NotePage.vue'
import { chapters, chapterGroups, getChapterHref } from './notes/chapters'
import { useChapterNavigation } from './notes/useChapterNavigation'
import PlaygroundPage from './runner/PlaygroundPage.vue'

const { currentChapter, currentSection } = useChapterNavigation()
const navigationOpen = ref(false)

const noteCount = chapters.filter((chapter) => chapter.kind === 'note').length
const labCount = chapters.length - noteCount
const chapterNumber = computed(() => chapters.indexOf(currentChapter.value) + 1)

const handleNavigateSection = (section: string) => {
  window.location.hash = getChapterHref(currentChapter.value, section)
}

watch(currentChapter, (chapter) => {
  document.title = `${chapter.title} · JavaScript 学习笔记`
  navigationOpen.value = false
}, { immediate: true })
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
              @click="navigationOpen = false"
            >
              <span class="chapter-number">{{ String(chapters.indexOf(chapter) + 1).padStart(2, '0') }}</span>
              <span class="chapter-title">{{ chapter.title }}</span>
              <svg v-if="chapter.kind === 'lab'" class="lab-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3h6M10 3v6l-6 10a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M7 15h10" />
              </svg>
            </a>
          </section>
        </nav>
      </aside>

      <div class="chapter-content">
        <NotePage
          v-if="currentChapter.kind === 'note'"
          :chapter="currentChapter"
          :chapter-number="chapterNumber"
          :section="currentSection"
          @navigate-section="handleNavigateSection"
        />
        <!-- 保留实验编辑状态和待保存任务，阅读笔记后可继续刚才的实验。 -->
        <KeepAlive>
          <PlaygroundPage
            v-if="currentChapter.kind === 'lab'"
            :topic="currentChapter.topic"
            embedded
          />
        </KeepAlive>
      </div>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

html,
body,
#app {
  margin: 0;
  width: 100%;
  height: 100%;
}

body {
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  color: #1f2328;
  background: #f7f7f8;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track,
::-webkit-scrollbar-corner {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background-color: #6b728040;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #6b728070;
}

::-webkit-scrollbar-thumb:active {
  background-color: #6b728099;
}

::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

@supports not selector(::-webkit-scrollbar) {
  * {
    scrollbar-width: thin;
    scrollbar-color: #6b728070 transparent;
  }
}

button,
input,
select,
textarea {
  font: inherit;
}

a,
button {
  -webkit-tap-highlight-color: transparent;
}

a:focus-visible,
button:focus-visible,
summary:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
}
</style>

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
