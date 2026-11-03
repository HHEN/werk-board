// Sunday button: sends a week from this app's data.json to the CrossFit Werk app.
// POST /api/publish { action: status | publish, tab, week, code } -> { status: draft | live | changed }
// The code is checked by the Werk app (its PUBLISH_CODE). Nothing secret is stored here.
const WERK = (process.env.WERK_URL || "https://crossfit-werk.vercel.app").replace(/\/$/, "");

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const proto = req.headers["x-forwarded-proto"] || "https";
    const data = await (await fetch(`${proto}://${req.headers.host}/data.json`, { cache: "no-store" })).json();
    const values = data.tabs?.[b.tab];
    if (!values) return res.status(404).json({ code: "no_week" });
    const r = await fetch(`${WERK}/api/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publish-code": String(b.code || "") },
      body: JSON.stringify({ action: b.action, tab: b.tab, week: b.week, values }),
    });
    return res.status(r.status).json(await r.json().catch(() => ({})));
  } catch (e) {
    return res.status(502).json({ code: "unreachable" });
  }
}
