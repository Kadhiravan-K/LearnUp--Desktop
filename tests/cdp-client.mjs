// CDP Client helper for native WebView2 automated testing
export class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.errors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
          this.consoleLogs.push({ type: msg.params.type, text });
          if (msg.params.type === 'error') {
            this.errors.push(text);
          }
        } else if (msg.method === 'Runtime.exceptionThrown') {
          const text = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
          this.errors.push(text);
        }

        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async eval(expression) {
    let script = expression.trim();
    if (!script.includes('return') && !script.includes(';') && !script.includes('\n')) {
      script = `return (${script});`;
    }
    const wrapped = `(async () => {\n${script}\n})()`;
    const res = await this.send('Runtime.evaluate', {
      expression: wrapped,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  async screenshot(outputPath) {
    const fs = await import('fs/promises');
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    await fs.writeFile(outputPath, buffer);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export async function getWebViewTarget(maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('http://localhost:9222/json');
      const targets = await res.json();
      const pageTarget = targets.find((t) => t.type === 'page' && (t.url.includes('1420') || t.url.includes('tauri.localhost') || t.title.includes('LearnUp') || t.webSocketDebuggerUrl));
      if (pageTarget) return pageTarget;
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const res = await fetch('http://localhost:9222/json');
  const targets = await res.json();
  throw new Error('No WebView2 page target found at localhost:9222/json: ' + JSON.stringify(targets));
}
