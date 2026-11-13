import { MIN_RESCAN_MS, loadCachedScan, scanAndCache } from "./scan.js";

const appsEl = document.getElementById("apps");
const dotEl = document.getElementById("dot");
const countEl = document.getElementById("count");

function statusClass(status) {
  if (status >= 500) return "err";
  if (status >= 400) return "warn";
  return "ok";
}

function message(text) {
  const el = document.createElement("div");
  el.className = "empty";
  el.textContent = text;
  return el;
}

function render(apps) {
  countEl.textContent = apps.length ? String(apps.length) : "";
  if (!apps.length) {
    appsEl.replaceChildren(message("No web apps found on localhost"));
    return;
  }
  appsEl.replaceChildren(
    ...apps.map((app) => {
      const link = document.createElement("a");
      link.className = "app";
      link.href = `http://localhost:${app.port}/`;
      link.target = "_blank"; // a popup closes on click, so open apps in a tab of their own
      link.title = `${app.title || "(no title)"}\nlocalhost:${app.port} · HTTP ${app.status}`;

      const icon = document.createElement("span");
      icon.className = "app-icon";
      icon.textContent = (app.title.match(/[\p{L}\p{N}]/u) || ["•"])[0].toUpperCase();
      const img = document.createElement("img");
      img.alt = "";
      img.src = app.icon;
      img.addEventListener("error", () => img.remove());
      icon.append(img);

      const name = document.createElement("span");
      name.className = "app-name";
      name.textContent = app.title || `localhost:${app.port}`;
      if (!app.title) name.classList.add("untitled");

      const port = document.createElement("span");
      port.className = `app-port ${statusClass(app.status)}`;
      port.textContent = `:${app.port}`;

      link.append(icon, name, port);
      return link;
    })
  );
}

let scanning = false;
let lastScanAt = 0;

async function refresh({ force = false } = {}) {
  if (scanning || (!force && Date.now() - lastScanAt < MIN_RESCAN_MS)) return;
  scanning = true;
  dotEl.classList.add("scanning");
  try {
    const result = await scanAndCache();
    lastScanAt = result.at;
    render(result.apps);
  } finally {
    scanning = false;
    dotEl.classList.remove("scanning");
  }
}

async function start() {
  // Show the previous scan straight away, then rescan unless it's fresh.
  const cached = await loadCachedScan();
  if (cached) {
    render(cached.apps);
    lastScanAt = cached.at;
  } else {
    appsEl.replaceChildren(message("Scanning…"));
  }
  refresh();
}

document.getElementById("refresh").addEventListener("click", () => refresh({ force: true }));
document.getElementById("settings").addEventListener("click", () => chrome.runtime.openOptionsPage());

start();
