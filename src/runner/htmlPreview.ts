// iframe 保持独立来源，通过消息返回日志；alert 也显示在输出区，避免阻塞阅读。
export const createHtmlPreview = (source: string) => `<!doctype html><meta charset="utf-8">
<script>
(() => {
  const send = (level, args) => parent.postMessage({ type: 'note-preview-log', level, text: args.map(String).join(' ') }, '*');
  for (const level of ['log', 'info', 'warn', 'error']) console[level] = (...args) => send(level, args);
  window.alert = (...args) => send('info', args);
  window.addEventListener('error', event => send('error', [event.message]));
  window.addEventListener('unhandledrejection', event => send('error', [event.reason]));
})();
</script>
${source}`
