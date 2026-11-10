import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const outputDir = new URL("./", import.meta.url).pathname;
const mobile = process.argv.includes("--mobile");
const chromePort = mobile ? 9338 : 9337;
const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
const flowName = (step) => mobile ? `hovex-flow-mobile-${step}` : `hovex-flow-${step}`;
const chrome = spawn("google-chrome", [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--hide-scrollbars",
  "--ignore-certificate-errors",
  `--remote-debugging-port=${chromePort}`,
  "--remote-allow-origins=*",
  `--window-size=${viewport.width},${viewport.height}`,
  `--user-data-dir=/tmp/hovex-audit-flow-${mobile ? "mobile" : "desktop"}-chrome`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getPageSocket() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${chromePort}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome may still be starting.
    }
    await sleep(100);
  }
  throw new Error("Chrome debugging endpoint did not become ready.");
}

const socket = new WebSocket(await getPageSocket());
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const listeners = new Map();

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message));
    else handler.resolve(message.result);
    return;
  }
  const queue = listeners.get(message.method);
  const handler = queue?.shift();
  handler?.(message.params);
});

function send(method, params = {}) {
  const id = nextId;
  nextId += 1;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

function once(method) {
  return new Promise((resolve) => {
    const queue = listeners.get(method) ?? [];
    queue.push(resolve);
    listeners.set(method, queue);
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(120);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function capture(name) {
  await sleep(350);
  const result = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(`${outputDir}${name}.png`, Buffer.from(result.data, "base64"));
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile,
  });
  if (mobile) {
    await send("Emulation.setUserAgentOverride", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    });
  }

  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url: "http://127.0.0.1:5174/" });
  await loaded;
  await waitFor("document.querySelector('#finder')");
  await sleep(700);

  await evaluate(`(() => {
    const budget = document.querySelector('#finder input[type="number"]');
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setValue.call(budget, '25000');
    budget.dispatchEvent(new Event('input', { bubbles: true }));
    budget.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#finder form').requestSubmit();
  })()`);
  await waitFor("[...document.querySelectorAll('button')].some((button) => button.textContent.includes('Մանրամասներ'))", 10000);
  await evaluate("document.querySelector('#vehicles').scrollIntoView({ block: 'start' }); window.scrollBy(0, -82)");
  await capture(flowName("02-results"));

  await evaluate(`([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Մանրամասներ'))).click()`);
  await waitFor("document.querySelector('[role=dialog]')");
  await capture(flowName("03-details"));

  await evaluate(`([...document.querySelectorAll('[role=dialog] button')].find((button) => button.textContent.includes('Խորհրդակցել'))).click()`);
  await waitFor("document.querySelector('[role=dialog] input[autocomplete=name]')");
  await capture(flowName("04-consultation"));

  await evaluate(`(() => {
    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const name = document.querySelector('[role=dialog] input[autocomplete=name]');
    const phone = document.querySelector('[role=dialog] input[autocomplete=tel]');
    setInput.call(name, 'Անի');
    name.dispatchEvent(new Event('input', { bubbles: true }));
    setInput.call(phone, '+37499123456');
    phone.dispatchEvent(new Event('input', { bubbles: true }));
    const consent = document.querySelector('[role=dialog] input[type=checkbox]');
    consent.click();
    document.querySelector('[role=dialog] form').requestSubmit();
  })()`);
  await waitFor("document.querySelector('[role=dialog] h3')?.textContent.includes('Շնորհակալություն')", 10000);
  await capture(flowName("05-success"));
} finally {
  socket.close();
  chrome.kill("SIGTERM");
}
