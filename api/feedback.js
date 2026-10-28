// Weekly feedback notes for Claude, in the same Upstash Redis store as the scores.
// GET  /api/feedback                    -> { feedback: { "Fall 2026|8": "text", ... } }
// GET  /api/feedback?week=Fall%202026%7C8 -> { feedback: "text" }
// POST /api/feedback {week, text}       -> { ok: true }
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "feedback";

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

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) return res.status(501).json({ code: "not_configured" });
  try {
    if (req.method === "GET") {
      if (req.query.week) return res.json({ feedback: (await redis(["HGET", KEY, String(req.query.week).slice(0, 60)])) || "" });
      const flat = (await redis(["HGETALL", KEY])) || [];
      const feedback = {};
      for (let i = 0; i < flat.length; i += 2) feedback[flat[i]] = flat[i + 1];
      return res.json({ feedback });
    }
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const week = String(b.week || "").slice(0, 60);
      if (!week) return res.status(400).json({ code: "bad_request" });
      const text = String(b.text || "").slice(0, 5000);
      if (text.trim()) await redis(["HSET", KEY, week, text]);
      else await redis(["HDEL", KEY, week]);
      return res.json({ ok: true });
    }
    return res.status(405).json({ code: "method" });
  } catch (e) {
    return res.status(502).json({ code: "store_error", message: e.message });
  }
}
