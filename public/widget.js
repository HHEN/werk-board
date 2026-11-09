// CheezyWednesday Programming — iOS home screen widget (Scriptable app)
// Shows today's workout from werk-board.vercel.app. Small, medium and large sizes.
// Runs one week ahead of class, like the app: on the test week you see the next class week.
// Optional widget parameter: "class" = show the class week instead of the test week.

const APP = "https://werk-board.vercel.app";
const AHEAD = 7;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PINK = new Color("#f272b4"), BLUE = new Color("#6b9cf2");
const BG = Color.dynamic(new Color("#ffffff"), new Color("#14181d"));
const INK = Color.dynamic(new Color("#14181d"), new Color("#e9ecf0"));
const MUTED = Color.dynamic(new Color("#5a6370"), new Color("#97a1ad"));

const clean = v => String(v ?? "").replace(/^'/, "").replace(/\r/g, "").trim();
function parseDate(s) {
  const m = clean(s).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function parseWeeks(values) {
  const weeks = []; let cur = null;
  for (let r = 0; r < values.length; r++) {
    const row = values[r] || [], a = clean(row[0]);
    if (/^\d{1,2}$/.test(a)) {
      cur = { no: +a, rows: {}, dates: [] }; weeks.push(cur);
      const next = values[r + 1] || [];
      if (!clean(next[0])) { cur.dates = next.slice(1, 8).map(parseDate); r++; }
      continue;
    }
    if (cur && a) cur.rows[a.toLowerCase()] = Array.from({ length: 7 }, (_, i) => clean(row[i + 1]));
  }
  return weeks.filter(w => {
    const i = w.dates.findIndex(Boolean);
    w.classStart = i >= 0 ? addDays(w.dates[i], -i) : null;
    const A = w.rows["wod a"] || [], B = w.rows["wod b"] || [];
    return w.classStart && (A.some(Boolean) || B.some(Boolean));
  });
}

function pickToday(data, ahead) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  for (const [tab, values] of Object.entries(data.tabs || {})) {
    for (const w of parseWeeks(values)) {
      const start = addDays(w.classStart, -ahead);
      if (t >= start && t < addDays(start, 7)) {
        const di = Math.round((t - start) / 864e5);
        return { tab, w, di, date: t };
      }
    }
  }
  return null;
}

async function load() {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.cacheDirectory(), "werk-board-data.json");
  try {
    const req = new Request(`${APP}/data.json`); req.timeoutInterval = 10;
    const data = await req.loadJSON();
    fm.writeString(cache, JSON.stringify(data));
    return data;
  } catch (e) {
    return fm.fileExists(cache) ? JSON.parse(fm.readString(cache)) : null;
  }
}

function addText(stack, text, font, color, lines) {
  const t = stack.addText(text); t.font = font; t.textColor = color;
  if (lines) t.lineLimit = lines; return t;
}

function wodBlock(stack, label, text, color, lines, size) {
  if (!text) return;
  const parts = text.split("\n").filter(s => s.trim() !== "");
  const head = stack.addStack(); head.centerAlignContent();
  const dot = head.addText("●"); dot.font = Font.systemFont(7); dot.textColor = color;
  head.addSpacer(4);
  addText(head, parts[0], Font.boldSystemFont(size), INK, 1);
  stack.addSpacer(1);
  addText(stack, parts.slice(1).join("\n"), Font.systemFont(size - 1), INK, lines);
  stack.addSpacer(6);
}

async function build() {
  const fam = config.widgetFamily || "large";
  const ahead = (args.widgetParameter || "").trim().toLowerCase() === "class" ? 0 : AHEAD;
  const data = await load();
  const w = new ListWidget();
  w.backgroundColor = BG; w.url = APP;
  w.setPadding(12, 14, 12, 14);
  w.refreshAfterDate = addDays(new Date(new Date().setHours(0, 5, 0, 0)), 1);

  const hit = data && pickToday(data, ahead);
  if (!hit) {
    addText(w, "CheezyWednesday", Font.boldSystemFont(13), PINK);
    w.addSpacer(4);
    addText(w, data ? "Nothing programmed for today yet." : "No connection.", Font.systemFont(12), MUTED);
    return w;
  }
  const { w: wk, di } = hit;
  const A = (wk.rows["wod a"] || [])[di], B = (wk.rows["wod b"] || [])[di];
  const focus = (wk.rows["focus of the day"] || [])[di];

  const top = w.addStack(); top.centerAlignContent();
  addText(top, `Week ${wk.no} · ${DAYS[di]}`, Font.boldSystemFont(fam === "small" ? 12 : 13), BLUE, 1);
  top.addSpacer();
  if (fam !== "small" && focus) addText(top, focus, Font.mediumSystemFont(11), MUTED, 1);
  w.addSpacer(6);

  const size = fam === "small" ? 11 : 13;
  if (fam === "small") {
    wodBlock(w, "A", A || B, PINK, 5, size);
  } else if (fam === "medium") {
    const row = w.addStack(); row.topAlignContent();
    const c1 = row.addStack(); c1.layoutVertically(); c1.size = new Size(0, 0);
    wodBlock(c1, "A", A, PINK, 5, 12);
    if (B) {
      row.addSpacer(10);
      const c2 = row.addStack(); c2.layoutVertically();
      wodBlock(c2, "B", B, BLUE, 5, 12);
    }
  } else {
    wodBlock(w, "A", A, PINK, 9, size);
    wodBlock(w, "B", B, BLUE, 9, size);
  }
  w.addSpacer();
  return w;
}

const widget = await build();
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentLarge();
Script.complete();
