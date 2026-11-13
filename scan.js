// Finds web apps on localhost by probing ports with GET /. No DOM code here; popup.js renders the result.
import { getSettings, portsToScan } from "./shared.js";

const PROBE_TIMEOUT_MS = 1500; // a busy single-threaded dev server may be slow, but not that slow
const CONCURRENCY = 128;
const MAX_HEAD_BYTES = 64 * 1024;
export const MIN_RESCAN_MS = 10_000; // opening the popup again right away reuses the last scan

/** Read the start of a response body (enough for <head>) and stop; never wait for a streaming body to end. */
async function readHead(resp) {
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (text.length < MAX_HEAD_BYTES && !/<\/head>/i.test(text)) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    // aborted or reset mid-body: use what arrived
  }
  reader.cancel().catch(() => {});
  return text;
}

function isLocalUrl(url) {
  return url.protocol === "data:" || url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

/** Probe http://localhost:<port>/. Returns app info if something there speaks HTTP, else null. */
async function probe(port) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), PROBE_TIMEOUT_MS);
  try {
    // Redirects are followed so apps whose "/" redirects to "/login" still get a title. Credentials are
    // omitted, so a redirect elsewhere is an anonymous GET, same as opening the link.
    const resp = await fetch(`http://localhost:${port}/`, {
      signal: abort.signal,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: { Accept: "text/html" },
    });
    // macOS AirPlay Receiver answers HTTP on ports 5000 and 7000; it's not an app.
    if ((resp.headers.get("server") || "").includes("AirTunes")) return null;

    let title = "";
    let icon = `http://localhost:${port}/favicon.ico`;
    if ((resp.headers.get("content-type") || "").includes("html")) {
      const doc = new DOMParser().parseFromString(await readHead(resp), "text/html");
      title = doc.title.trim().replace(/\s+/g, " ");
      const href = doc.querySelector('link[rel~="icon"]')?.getAttribute("href");
      if (href) {
        try {
          const url = new URL(href, resp.url);
          if (isLocalUrl(url)) icon = url.href;
        } catch {
          // keep /favicon.ico
        }
      }
    } else {
      resp.body?.cancel().catch(() => {});
    }
    return { port, status: resp.status, title, icon };
  } catch {
    return null; // nothing listening, not HTTP, or too slow
  } finally {
    clearTimeout(timer);
  }
}

/** Probe every port; returns the apps found, sorted by port. Never throws. */
export async function scan(ports) {
  const found = [];
  let next = 0;
  const worker = async () => {
    while (next < ports.length) {
      const app = await probe(ports[next++]);
      if (app) found.push(app);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ports.length) }, worker));
  return found.sort((a, b) => a.port - b.port);
}

/** The previous scan, if it was made with the current settings: {at, apps} or null. */
export async function loadCachedScan() {
  try {
    const { lastScan } = await chrome.storage.local.get("lastScan");
    const settings = await getSettings();
    return lastScan && lastScan.key === JSON.stringify(settings) ? lastScan : null;
  } catch {
    return null;
  }
}

/** Scan with the saved settings and remember the result. */
export async function scanAndCache() {
  const settings = await getSettings();
  const apps = await scan(portsToScan(settings));
  const result = { at: Date.now(), key: JSON.stringify(settings), apps };
  chrome.storage.local.set({ lastScan: result }).catch(() => {});
  return result;
}
