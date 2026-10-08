import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { runnerEditsPlugin } from './runner-edits-server'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    runnerEditsPlugin(),
  ],
  resolve: {
    alias: {
      '@': `${import.meta.dir}/src`
    },
  },
})
