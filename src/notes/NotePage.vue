<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getChapterHref } from './chapters'
import type { NoteChapter } from './types'
import NoteContent from './NoteContent.vue'
import './reference-diagrams.css'

const props = defineProps<{
  chapter: NoteChapter
  chapterNumber: number
  section: string
}>()
const emit = defineEmits<{
  navigateSection: [section: string]
}>()

const scrollContainer = ref<HTMLElement | null>(null)
const outlineContainer = ref<HTMLElement | null>(null)
const activeSection = ref('')
const outlineOpen = ref(false)
let headingElements: HTMLElement[] = []
let scrollFrame = 0

const title = computed(() => props.chapter.document.title ?? props.chapter.title)
const headings = computed(() => props.chapter.document.headings)

const syncOutlineScroll = () => {
  const container = outlineContainer.value
  const activeLink = container?.querySelector<HTMLElement>('[aria-current="location"]')
  if (!container || !activeLink || !container.clientHeight) return
  const containerTop = container.getBoundingClientRect().top
  const linkRect = activeLink.getBoundingClientRect()
  if (linkRect.top >= containerTop && linkRect.bottom <= containerTop + container.clientHeight) return
  // 仅滚动目录容器，让当前小节可见，避免带动正文滚动。
  container.scrollTo({
    top: container.scrollTop + linkRect.top - containerTop - (container.clientHeight - linkRect.height) / 2,
    behavior: 'instant',
  })
}

const updateActiveSection = () => {
  const container = scrollContainer.value
  if (!container) return
  const limit = container.getBoundingClientRect().top + 100
  let current = headingElements[0]?.id ?? ''
  for (const heading of headingElements) {
    if (heading.getBoundingClientRect().top > limit) break
    current = heading.id
  }
  if (container.scrollTop > 0 && container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
    current = headingElements.at(-1)?.id ?? current
  }
  activeSection.value = current
}

const scrollToSection = (section: string) => {
  const container = scrollContainer.value
  if (!container) return
  const target = headingElements.find((heading) => heading.id === section)
  // 目录也可以定位到折叠答案内的小节。
  for (let parent = target?.parentElement; parent && parent !== container; parent = parent.parentElement) {
    if (parent instanceof HTMLDetailsElement) parent.open = true
  }
  const top = target
    ? target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 28
    : 0
  container.scrollTo({ top, behavior: 'instant' })
  updateActiveSection()
}

const handleScroll = () => {
  if (scrollFrame) return
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0
    updateActiveSection()
  })
}

const handleNavigateSection = async (event: MouseEvent, section: string) => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  emit('navigateSection', section)
  outlineOpen.value = false
  await nextTick()
  scrollToSection(section)
}

watch(
  () => [activeSection.value, outlineOpen.value, props.chapter.document] as const,
  syncOutlineScroll,
  { flush: 'post' },
)

watch(
  () => [props.chapter.document, props.section] as const,
  async () => {
    await nextTick()
    const container = scrollContainer.value
    if (!container) return
    headingElements = Array.from(container.querySelectorAll<HTMLElement>('[id^="section-"]'))
    scrollToSection(props.section)
  },
  { immediate: true, flush: 'post' },
)

onBeforeUnmount(() => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
})
</script>

<template>
  <div class="note-layout">
    <main ref="scrollContainer" class="note-scroll" @scroll.passive="handleScroll">
      <article class="note-article">
        <header class="note-header">
          <div class="note-breadcrumb">{{ chapter.group }} <span>/</span> 第 {{ String(chapterNumber).padStart(2, '0') }} 章</div>
          <h1>{{ title }}</h1>
          <p>{{ chapter.description }}</p>
        </header>
        <div class="markdown-body">
          <NoteContent :key="chapter.document.html" :html="chapter.document.html" />
        </div>
        <a class="back-to-top" :href="getChapterHref(chapter)" @click="scrollContainer?.scrollTo({ top: 0 })">回到本章开头 ↑</a>
      </article>
    </main>

    <aside v-if="headings.length" class="note-outline" :class="{ expanded: outlineOpen }">
      <div class="outline-heading">本章目录 <span>{{ headings.length }} 节</span></div>
      <button
        class="outline-toggle"
        type="button"
        aria-controls="note-outline-links"
        :aria-expanded="outlineOpen"
        @click="outlineOpen = !outlineOpen"
      >
        本章目录 <span>{{ headings.length }} 节 {{ outlineOpen ? '收起 −' : '展开 +' }}</span>
      </button>
      <nav id="note-outline-links" ref="outlineContainer" class="outline-links" aria-label="本章目录">
        <a
          v-for="heading in headings"
          :key="heading.id"
          :href="getChapterHref(chapter, heading.id)"
          :class="{ active: activeSection === heading.id, nested: heading.level >= 3 }"
          :aria-current="activeSection === heading.id ? 'location' : undefined"
          @click="handleNavigateSection($event, heading.id)"
        >{{ heading.text }}</a>
      </nav>
    </aside>
  </div>
</template>

<style scoped>
.note-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 236px;
  height: 100%;
}

.note-scroll {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.note-article {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 34px 44px 48px;
}

.note-header {
  padding-bottom: 25px;
  margin-bottom: 28px;
  border-bottom: 1px solid #e5e5e7;
}

.note-breadcrumb {
  font-size: 12px;
  color: #6b7280;
}

.note-breadcrumb span {
  padding: 0 9px;
  color: #c0c5ce;
}

.note-header h1 {
  font-size: 27px;
  line-height: 1.4;
  letter-spacing: -.5px;
  margin: 14px 0 10px;
  font-weight: 650;
}

.note-header p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #6b7280;
}

.note-outline {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 28px 15px 22px;
  border-left: 1px solid #e5e5e7;
  background: #fafafa;
}

.outline-heading {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 0 10px 12px;
  font-size: 12px;
  font-weight: 600;
}

.outline-heading span {
  font-size: 11px;
  font-weight: 400;
  color: #9ca3af;
}

.outline-links {
  min-height: 0;
  overflow-y: auto;
}

.outline-links a {
  display: block;
  padding: 7px 10px;
  margin: 2px 0;
  border-left: 2px solid transparent;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.outline-links a.nested {
  padding-left: 20px;
  font-size: 11px;
}

.outline-links a:hover {
  color: #1f2328;
  background: #f0f0f1;
  border-radius: 0 5px 5px 0;
}

.outline-links a.active {
  color: #2563eb;
  border-left-color: #2563eb;
  background: #eef2ff;
}

.outline-toggle {
  display: none;
}

.back-to-top {
  display: inline-block;
  margin-top: 36px;
  font-size: 12px;
  color: #6b7280;
  text-decoration: none;
}

.back-to-top:hover {
  color: #2563eb;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.markdown-body {
  font-size: 15px;
  line-height: 1.85;
  overflow-wrap: anywhere;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  line-height: 1.5;
  font-weight: 600;
  margin: 32px 0 14px;
  scroll-margin-top: 28px;
}

.markdown-body :deep(h1) {
  font-size: 24px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e5e7;
}

.markdown-body :deep(h2) {
  font-size: 21px;
}

.markdown-body :deep(h3) {
  font-size: 17px;
}

.markdown-body :deep(h4) {
  font-size: 15px;
}

.markdown-body :deep(p) {
  margin: 12px 0 16px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 25px;
  margin: 14px 0;
}

.markdown-body :deep(li) {
  margin: 6px 0;
}

.markdown-body :deep(li > p) {
  margin: 6px 0;
}

.markdown-body :deep(a) {
  color: #2563eb;
  text-underline-offset: 3px;
}

.markdown-body :deep(blockquote) {
  margin: 18px 0;
  padding: 2px 18px;
  border-left: 3px solid #b7c8f7;
  background: #eef2ff70;
  color: #4b5563;
  border-radius: 0 6px 6px 0;
}

.markdown-body :deep(hr) {
  margin: 30px 0;
  height: 1px;
  border: 0;
  background: #e5e5e7;
}

.markdown-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .88em;
  border-radius: 5px;
  padding: 2px 6px;
  background: #edf0f5;
  color: #526078;
}

.markdown-body :deep(.note-code-block) {
  position: relative;
  margin: 22px 0 26px;
  border: 1px solid #e3e8ef;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2px 4px #18243b03, 0 8px 24px #18243b04;
}

.markdown-body :deep(pre) {
  margin: 0;
  padding: 22px 24px;
  overflow-x: auto;
  color: #334155;
  font-size: 13px;
  line-height: 1.8;
  tab-size: 2;
}

.markdown-body :deep(pre code) {
  padding: 0;
  color: inherit;
  background: none;
  border-radius: 0;
  font-size: inherit;
}

.markdown-body :deep(.syntax-keyword) {
  color: #8250b5;
}

.markdown-body :deep(.syntax-string) {
  color: #16715b;
}

.markdown-body :deep(.syntax-comment) {
  color: #7c8799;
}

.markdown-body :deep(.syntax-number) {
  color: #b35c20;
}

.markdown-body :deep(.syntax-identifier) {
  color: #315b83;
}

.markdown-body :deep(.copy-code) {
  position: absolute;
  top: 7px;
  right: 9px;
  padding: 4px 9px;
  border: 1px solid #ffffff25;
  border-radius: 4px;
  color: #c1c5cd;
  background: #ffffff08;
  font-size: 11px;
  cursor: pointer;
}

.markdown-body :deep(.copy-code:hover) {
  color: #fff;
  background: #ffffff15;
}

.markdown-body :deep(table) {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 20px 0;
  font-size: 13px;
  line-height: 1.7;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 10px 14px;
  border: 1px solid #dfe2e7;
  min-width: 100px;
}

.markdown-body :deep(th) {
  background: #edf0f5;
  text-align: left;
  font-weight: 600;
}

.markdown-body :deep(tr:nth-child(even)) {
  background: #f0f1f4;
}

.markdown-body :deep(details) {
  border: 1px solid #dfe2e7;
  border-radius: 6px;
  padding: 0 16px;
  margin: 18px 0;
  background: #fff;
}

.markdown-body :deep(summary) {
  padding: 12px 0;
  color: #2563eb;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.markdown-body :deep(details[open] summary) {
  margin-bottom: 12px;
  border-bottom: 1px solid #e5e5e7;
}

.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.markdown-body :deep(input[type='checkbox']) {
  margin-right: 6px;
  accent-color: #2563eb;
}

@media (max-width: 1100px) {
  .note-layout {
    display: flex;
    flex-direction: column;
  }

  .note-scroll {
    flex: 1;
  }

  .note-article {
    padding: 28px 30px 40px;
  }

  .note-outline {
    order: -1;
    flex: 0 0 auto;
    padding: 0;
    border-left: 0;
    border-bottom: 1px solid #e5e5e7;
  }

  .outline-heading {
    display: none;
  }

  .outline-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 12px 24px;
    border: 0;
    color: #4b5563;
    background: transparent;
    font-size: 12px;
    cursor: pointer;
    text-align: left;
  }

  .outline-toggle span {
    color: #9ca3af;
    font-size: 11px;
  }

  .outline-links {
    display: none;
    max-height: 210px;
    padding: 0 16px 12px;
  }

  .note-outline.expanded .outline-links {
    display: block;
  }
}

@media (max-width: 720px) {
  .note-article {
    padding: 24px 20px 36px;
  }

  .note-header h1 {
    font-size: 23px;
  }

  .markdown-body {
    font-size: 14px;
  }

  .markdown-body :deep(h1) {
    font-size: 21px;
  }

  .markdown-body :deep(h2) {
    font-size: 19px;
  }

  .markdown-body :deep(pre) {
    font-size: 12px;
  }
}
</style>
