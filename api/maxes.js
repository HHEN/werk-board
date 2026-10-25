// Shared 1RMs for Pia and Henning, in the same Upstash Redis store as the scores.
// GET  /api/maxes                         -> { maxes: { "pia:back-squat": "80", ... } }
// POST /api/maxes {person, lift, value}   -> { ok: true }
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PEOPLE = ["pia", "henning"];
const KEY = "maxes";

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
      const flat = (await redis(["HGETALL", KEY])) || [];
      const maxes = {};
      for (let i = 0; i < flat.length; i += 2) maxes[flat[i]] = flat[i + 1];
      return res.json({ maxes });
    }
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      if (!PEOPLE.includes(b.person) || !/^[a-z-]{2,30}$/.test(String(b.lift || ""))) return res.status(400).json({ code: "bad_request" });
      const value = String(b.value || "").trim().replace(",", ".");
      const field = `${b.person}:${b.lift}`;
      if (value === "") await redis(["HDEL", KEY, field]);
      else if (/^\d{1,3}(\.\d{1,2})?$/.test(value)) await redis(["HSET", KEY, field, value]);
      else return res.status(400).json({ code: "bad_value" });
      return res.json({ ok: true });
    }
    return res.status(405).json({ code: "method" });
  } catch (e) {
    return res.status(502).json({ code: "store_error", message: e.message });
  }
}
