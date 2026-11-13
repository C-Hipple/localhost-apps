import { DEFAULTS, getSettings, parsePorts, portsToScan, saveSettings } from "./shared.js";

const portsEl = document.getElementById("ports");
const ignoreEl = document.getElementById("ignore");
const portsHint = document.getElementById("ports-hint");
const ignoreHint = document.getElementById("ignore-hint");
const saveBtn = document.getElementById("save");
const savedEl = document.getElementById("saved");

const IGNORE_HELP = "Databases and brokers that don't speak HTTP.";

function validate() {
  const bad = parsePorts(portsEl.value).invalid;
  const badIgnore = parsePorts(ignoreEl.value).invalid;
  const count = portsToScan({ ports: portsEl.value, ignore: ignoreEl.value }).length;

  portsHint.classList.toggle("error", bad.length > 0);
  portsHint.textContent = bad.length
    ? `Not a port or range: ${bad.join(", ")}`
    : `Numbers or ranges, e.g. 80, 3000-9999. ${count.toLocaleString()} ports will be scanned` +
      (count > 20000 ? " — that many can make the popup slow to fill." : ".");
  ignoreHint.classList.toggle("error", badIgnore.length > 0);
  ignoreHint.textContent = badIgnore.length ? `Not a port or range: ${badIgnore.join(", ")}` : IGNORE_HELP;

  saveBtn.disabled = bad.length > 0 || badIgnore.length > 0;
  savedEl.textContent = "";
}

function show(settings) {
  portsEl.value = settings.ports;
  ignoreEl.value = settings.ignore;
  validate();
}

saveBtn.addEventListener("click", async () => {
  await saveSettings({ ports: portsEl.value.trim(), ignore: ignoreEl.value.trim() });
  savedEl.textContent = "Saved. The popup will use this next time it opens.";
});
document.getElementById("reset").addEventListener("click", () => show(DEFAULTS));
portsEl.addEventListener("input", validate);
ignoreEl.addEventListener("input", validate);

getSettings().then(show);
