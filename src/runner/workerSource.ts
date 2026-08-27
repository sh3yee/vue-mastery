// Web Worker 执行沙箱的 harness 源码。
// 作为字符串导出，运行时用 Blob URL 实例化 Worker，避免 Vite 单独打包 worker 文件。
// 职责：覆盖 console、捕获未处理错误、用「静默期」判定异步运行结束，把输出 postMessage 回主线程。

export const workerSource = `
(function () {
  var QUIET_MS = 200; // 连续无输出多久后判定运行结束
  var HARD_MS = 5000; // 硬上限：超过即强制结束（防死循环/长任务）
  var doneTimer = null;
  var hardTimer = null;
  var running = false;

  function send(msg) {
    self.postMessage(msg);
  }

  // 把任意值格式化为字符串，近似浏览器 console 的展示
  function formatArg(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    var t = typeof arg;
    if (t === 'string') return arg;
    if (t === 'number' || t === 'boolean' || t === 'bigint' || t === 'symbol') return String(arg);
    if (t === 'function') return arg.toString();
    if (arg instanceof Error) return arg.name + ': ' + arg.message;
    try {
      return JSON.stringify(arg, function (_k, v) {
        if (typeof v === 'function') return '[Function]';
        if (typeof v === 'undefined') return null; // JSON 里没有 undefined，用 null 占位
        return v;
      }, 2);
    } catch (e) {
      try { return String(arg); } catch (e2) { return '[object]'; }
    }
  }

  function emit(level, args) {
    var text = Array.prototype.map.call(args, formatArg).join(' ');
    send({ type: 'log', level: level, text: text });
    scheduleDone(); // 每次输出都重置静默计时器
  }

  function scheduleDone() {
    if (!running) return;
    if (doneTimer) clearTimeout(doneTimer);
    doneTimer = self.setTimeout(flushDone, QUIET_MS);
  }

  function flushDone() {
    if (!running) return;
    running = false;
    if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
    if (hardTimer) { clearTimeout(hardTimer); hardTimer = null; }
    send({ type: 'done' });
  }

  function hardStop() {
    if (!running) return;
    running = false;
    if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
    hardTimer = null;
    send({ type: 'log', level: 'error', text: '⚠ 运行超过 ' + HARD_MS + 'ms 已自动终止（可能存在死循环或长时间计算）。' });
    send({ type: 'done' });
  }

  function run(code) {
    running = true;
    // 先排一个静默计时器：代码若不产生任何输出也能正常结束
    if (doneTimer) clearTimeout(doneTimer);
    doneTimer = self.setTimeout(flushDone, QUIET_MS);
    hardTimer = self.setTimeout(hardStop, HARD_MS);
    try {
      // 间接 eval：在 Worker 全局作用域执行用户代码
      (0, eval)(code);
    } catch (e) {
      emit('error', [e]);
      flushDone();
    }
    scheduleDone();
  }

  // 覆盖 console，把输出转发给主线程
  self.console = {
    log: function () { emit('log', arguments); },
    info: function () { emit('info', arguments); },
    warn: function () { emit('warn', arguments); },
    error: function () { emit('error', arguments); },
    debug: function () { emit('log', arguments); }
  };

  // 捕获未处理的同步错误
  self.onerror = function (message, _src, _line, _col, error) {
    var text = error ? String(error) : String(message);
    emit('error', [text]);
    return true; // 阻止默认输出，避免重复
  };

  // 捕获未处理的 Promise rejection
  self.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    var text;
    if (reason instanceof Error) {
      text = 'Unhandled Promise Rejection: ' + reason.name + ': ' + reason.message;
    } else {
      text = 'Unhandled Promise Rejection: ' + formatArg(reason);
    }
    emit('error', [text]);
    event.preventDefault(); // 阻止默认控制台输出
  });

  self.onmessage = function (e) {
    var data = e.data;
    if (!data) return;
    if (data.type === 'run') run(String(data.code));
  };

  send({ type: 'ready' });
})();
`
