// Shared scores for Pia and Henning, stored in Upstash Redis (Vercel Storage → Upstash).
// GET  /api/scores?week=Fall%202026%7C8           -> { scores: { "0:pia": "5+12", ... } }
// POST /api/scores {week, day, person, value}      -> { ok: true }
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PEOPLE = ["pia", "henning"];

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `Redis ${r.status}`);
  return j.result;
}

const weekKey = (w) => "scores:" + String(w || "").slice(0, 60);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) return res.status(501).json({ code: "not_configured" });
  try {
    if (req.method === "GET") {
      const flat = (await redis(["HGETALL", weekKey(req.query.week)])) || [];
      const scores = {};
      for (let i = 0; i < flat.length; i += 2) scores[flat[i]] = flat[i + 1];
      return res.json({ scores });
    }
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const day = Number(b.day);
      if (!b.week || !(day >= 0 && day <= 6) || !PEOPLE.includes(b.person)) return res.status(400).json({ code: "bad_request" });
      const field = `${day}:${b.person}`;
      const value = String(b.value || "").trim().slice(0, 60);
      if (value) await redis(["HSET", weekKey(b.week), field, value]);
      else await redis(["HDEL", weekKey(b.week), field]);
      return res.json({ ok: true });
    }
    return res.status(405).json({ code: "method" });
  } catch (e) {
    return res.status(502).json({ code: "store_error", message: e.message });
  }
}
