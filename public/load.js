// Movement database helpers: classify a WOD line, estimate the day's load per tag,
// and flag back-to-back days that hit the same tag hard (e.g. lots of DU, then box jumps).
// Used by the app (window.WerkLoad) and by Node scripts (module.exports).
(function (root) {
  const THRESH = {
    // [heavy, any]: warn if one day >= heavy and the neighbour >= any, or both >= both
    Jump: { heavy: 150, any: 40, both: 80, unit: "jumps" },
    Grip: { both: 80, unit: "grip reps" },
    Overhead: { both: 60, unit: "overhead reps" },
    Core: { both: 150, unit: "core reps" },
  };
  let DB = [];
  function setDB(db) {
    DB = (db && db.movements || []).map(m => Object.assign({}, m, { re: new RegExp(m.match, "i") }));
  }
  function classify(line) {
    for (const m of DB) { const x = line.match(m.re); if (x) return { m, at: x.index }; }
    return null;
  }
  const SKIP = /^\s*(rest|tc|split|one works|score|goal|then|switch|start)\b/i;

  function repsFor(line, hit) {
    const before = line.slice(0, hit.at);
    const dist = before.match(/(\d+)\s*m\b[^\d]*$/i);
    if (dist && hit.m.fn.includes("Pull") && /carry|march|farmers|suitcase/i.test(hit.m.name)) return +dist[1] / 2.5;
    if (/^\s*max\b/i.test(before.replace(/^\s*\d\)\s*/, ""))) return 10;
    const clock = before.match(/(\d+):(\d{2})\D*$/); if (clock) return (+clock[1] * 60 + +clock[2]) / 4;
    const steps = line.match(/(\d+)\s*steps/i); if (steps) return +steps[1] / 2;
    const sec = before.match(/(\d+)\s*s\b[^\d]*$/i); if (sec) return +sec[1] / 2;
    const n = before.match(/(\d+)(?:\/\d+)?\D*$/);
    if (!n) return null;
    let r = +n[1];
    if (/\beach\b(?![^(]*\))/i.test(line)) r *= 2;
    return r;
  }

  // Estimate reps per movement for one workout text.
  function estimateWod(text, notes) {
    if (!text || /%/.test(text)) return [];
    const lines = text.split("\n");
    const head = lines.slice(0, 2).join(" ");
    let mult = 1;
    const rounds = text.match(/(\d+)\s*(rounds?|sets?)\b/i);
    const xn = text.match(/\bx\s*(\d+)\b/i) || text.match(/E\d+(?:[.,]\d+)?Mx(\d+)/i);
    const amrap = head.match(/AMRAP\s*(\d+)/i);
    const emom = head.match(/EMOM\s*(\d+)/i);
    const stations = lines.filter(l => /^\s*\d\)/.test(l)).length;
    if (rounds) mult = +rounds[1];
    else if (xn) mult = +xn[1];
    else if (amrap) { const g = (notes || "").match(/(\d+)\+?\s*rounds/i); mult = g ? +g[1] : Math.max(1, Math.round(+amrap[1] / 2)); }
    else if (emom) mult = stations ? +emom[1] / stations : +emom[1];
    if (/teams? of 2|in pairs/i.test(head)) mult /= 2;
    let ladder = null;
    const out = [];
    for (const ln of lines) {
      if (/^\s*\d+(\s*-\s*\d+){2,}/.test(ln) && !/[a-z]{3}/i.test(ln.replace(/\.\.\./, ""))) {
        ladder = ln.split("-").map(s => parseInt(s, 10)).filter(n => !isNaN(n)).reduce((a, b) => a + b, 0);
        continue;
      }
      if (SKIP.test(ln)) continue;
      const hit = classify(ln); if (!hit) continue;
      let r = repsFor(ln, hit);
      if (r == null) r = ladder;
      if (r == null) continue;
      out.push({ name: hit.m.name, kind: hit.m.kind, tags: hit.m.tags, jump: hit.m.jump, reps: r * (ladder && repsFor(ln, hit) == null ? 1 : mult) });
    }
    return out;
  }

  function dayLoad(wodA, wodB, notes) {
    const items = estimateWod(wodA, notes).concat(estimateWod(wodB, notes));
    const tags = { Jump: 0, Legs: 0, Grip: 0, Overhead: 0, Core: 0 }, src = {};
    for (const it of items) {
      if (it.kind === "M" && !it.jump) continue; // run, row, bike: distance/calories, not reps
      for (const t of it.tags) {
        const v = t === "Jump" ? it.reps * (it.jump || 0) : it.reps;
        if (!v) continue;
        tags[t] += v;
        (src[t] = src[t] || {})[it.name] = (src[t][it.name] || 0) + v;
      }
    }
    return { tags, src, items };
  }

  const top = (src, t) => Object.entries(src[t] || {}).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => n).join(" + ");

  // Compare two neighbouring days; returns warnings [{tag, a, b, text}]
  function compare(dA, dB, labelA, labelB) {
    const out = [];
    for (const [t, th] of Object.entries(THRESH)) {
      const a = Math.round(dA.tags[t]), b = Math.round(dB.tags[t]);
      const hit = (th.heavy && ((a >= th.heavy && b >= th.any) || (b >= th.heavy && a >= th.any))) || (a >= th.both && b >= th.both);
      if (hit) out.push({ tag: t, a, b, text: `${t}: ~${a} ${labelA} (${top(dA.src, t)}) + ~${b} ${labelB} (${top(dB.src, t)})` });
    }
    return out;
  }

  const api = { setDB, classify, estimateWod, dayLoad, compare, THRESH };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.WerkLoad = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
