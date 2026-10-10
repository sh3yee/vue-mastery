---
name: learning-notes
description: 编写、审阅和整理本项目的中文学习笔记，按初学者路线推导知识，提供独立运行示例、HTML 关系图和阶段练习。适用于 content/notes 下的笔记任务。
---

# 学习笔记

处理笔记任务前，读取 [references/notebook.md](references/notebook.md)，按其中的教学推进、示例和质量检查要求执行。只调整网页功能或 README 时不必加载该参考。

## 本项目的入口

- 笔记位于 `content/notes/<主题>/main.md`，相对图片放在该主题的 `assets/` 下。
- 章节标题、分组、顺序在 `content/catalog.ts` 中维护，保留已有章节 ID。
- 关系图复用 `src/features/notes/reference-diagrams.css` 和 `tooling/markdown/render.ts` 允许的 HTML 标签与类名。
- 参考笔记为 `content/notes/deep-clone/main.md`。
- 完成后按改动范围执行内容校验或可信示例验证。内容检查命令为 `bun run check-content`。

原始规范中的教学要求由参考文件统一维护，不要在其他位置复制第二份。
