// Settings shared by the popup and the options page.

export const DEFAULTS = {
  // Which localhost ports to look at. Comma/space/newline separated numbers or ranges.
  ports: "80, 1234, 3000-9999",
  // Ports skipped even if inside the ranges above: well-known databases and brokers that don't speak HTTP,
  // so they don't get HTTP junk written to their logs every time a tab opens.
  ignore: "3306, 5432, 5672, 5900, 6379, 9042, 9092",
};

/** Parse "80, 3000-3010" into {ports: Set<number>, invalid: string[]}. */
export function parsePorts(text) {
  const ports = new Set();
  const invalid = [];
  for (const token of text.split(/[\s,]+/).filter(Boolean)) {
    const m = /^(\d{1,5})(?:-(\d{1,5}))?$/.exec(token);
    const lo = m && Number(m[1]);
    const hi = m && Number(m[2] ?? m[1]);
    if (!m || lo < 1 || hi > 65535 || lo > hi) {
      invalid.push(token);
      continue;
    }
    for (let p = lo; p <= hi; p++) ports.add(p);
  }
  return { ports, invalid };
}

export async function getSettings() {
  try {
    const saved = await chrome.storage.local.get({ settings: DEFAULTS });
    return { ...DEFAULTS, ...saved.settings };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

/** The sorted list of ports to scan for a given settings object. */
export function portsToScan(settings) {
  const wanted = parsePorts(settings.ports).ports;
  const ignored = parsePorts(settings.ignore).ports;
  return [...wanted].filter((p) => !ignored.has(p)).sort((a, b) => a - b);
}
