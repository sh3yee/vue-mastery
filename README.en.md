# Vue Mastery

[简体中文](README.md) | **English**

A JavaScript learning project built with Vue 3, bringing together notes, runnable examples, and exercises so you can read, experiment, and check your understanding in one place.

## Topics

| Category | Topics |
| --- | --- |
| Core concepts | Lexical scope, closures, this binding, prototypes and inheritance, deep cloning |
| Functions and applications | call, apply, implementing function calls and object creation, debouncing and throttling |
| Asynchronous JavaScript | The event loop, Promise |
| Exercises | Predicting output in Promise and event loop examples |

The learning notes and exercises are currently primarily in Chinese.

## How to use

- **Read the notes**: Browse by category, navigate with the chapter outline, and explore diagrams and expandable explanations.
- **Run examples**: Edit and run JavaScript examples in the notes, inspect their output, and change inputs to test your understanding.
- **Practice**: Predict the output first, run the code, then compare it with the expected output and explanation.

The interface supports mobile reading and shareable chapter links. In local development mode, edits to exercise code are automatically saved to `public/runner-edits.json`. Build preview mode does not write to this file.

## Getting started

Requires **Bun 1.4.2 or later**. Run these commands from the project root:

```powershell
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed in the terminal to start reading and practicing.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the local development server |
| `bun run type-check` | Check TypeScript and Vue component types |
| `bun run build` | Check types, then build into `dist` |
| `bun run build-only` | Build without type checking |
| `bun run check-content` | Validate chapters, exercises, and resources |
| `bun test` | Run regression tests |
| `bun run preview` | Preview an existing build locally |

## Project structure

| Path | Contents |
| --- | --- |
| `content/notes/` | Markdown notes and their assets |
| `content/exercises/` | Exercises, expected output, and explanations |
| `content/catalog.ts` | Chapter metadata, groups, and ordering |
| `contracts/` | Content and saved-edit data types |
| `src/app/` | Application layout and chapter navigation |
| `src/features/` | Note reading and exercise features |
| `src/shared/code-playground/` | Shared editor, runner, and output panel |
| `tooling/` | Markdown processing and local save service |
| `.codex/skills/learning-notes/` | Project skill for writing learning notes |

Built with Vue 3, TypeScript, Vite, and Bun.

## Adding learning material

**Update a note**: Edit the topic’s `main.md`. Follow the guidelines in [note-writing guidelines](.codex/skills/learning-notes/references/notebook.md), keeping examples short and independently runnable.

**Add a note**: Create `content/notes/<topic>/main.md`, then register the chapter in `content/catalog.ts`.

**Add exercises**: Use `content/exercises/promise-event-loop.ts` as a reference for questions, expected output, and explanations, then register the topic in `content/catalog.ts`.

See [architecture notes](docs/architecture.md) for module boundaries. The root `AGENTS.md` directs Codex to read the project skill for note-writing tasks.
