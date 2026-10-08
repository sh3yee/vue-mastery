import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { runnerEditsPlugin } from './runner-edits-server'
import { notesPlugin } from './notes-plugin'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    notesPlugin(),
    vue(),
    runnerEditsPlugin(),
  ],
  resolve: {
    alias: {
      '@': `${import.meta.dir}/src`
    },
  },
})
