import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret)
    return new Response("Unauthorized", { status: 401, headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendKey || !from)
    return new Response("Email provider is not configured", {
      status: 500,
      headers: cors,
    });
  const db = createClient(url, key, { auth: { persistSession: false } });
  // Recover claims abandoned by a runtime crash so one transient failure does not lose a reminder.
  const staleBefore = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await db
    .from("reminders")
    .update({ status: "pending", processing_at: null })
    .eq("status", "processing")
    .or(`processing_at.lt.${staleBefore},processing_at.is.null`);
  const today = new Date().toISOString().slice(0, 10);
  const { data: due, error } = await db
    .from("reminders")
    .select(
      "id,user_id,item_id,days_before,items(name,brand,warranty_end,receipts(file_url))",
    )
    .eq("status", "pending")
    .lte("reminder_date", today)
    .limit(250);
  if (error) return new Response(error.message, { status: 500, headers: cors });
  let sent = 0,
    skipped = 0,
    failed = 0;
  for (const reminder of due || []) {
    const { data: claimed } = await db
      .from("reminders")
      .update({ status: "processing", processing_at: new Date().toISOString() })
      .eq("id", reminder.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    try {
      const { data: prefs } = await db
        .from("user_settings")
        .select("email_alerts,notification_email")
        .eq("user_id", reminder.user_id)
        .maybeSingle();
      if (!prefs?.email_alerts) {
        await db
          .from("reminders")
          .update({ status: "cancelled", processing_at: null })
          .eq("id", reminder.id);
        skipped++;
        continue;
      }
      const { data: authData } = await db.auth.admin.getUserById(
        reminder.user_id,
      );
      const email = prefs.notification_email || authData.user?.email;
      if (!email) {
        await db
          .from("reminders")
          .update({ status: "failed", processing_at: null })
          .eq("id", reminder.id);
        failed++;
        continue;
      }
      const item = Array.isArray(reminder.items)
        ? reminder.items[0]
        : reminder.items;
      const subject = `${item?.name || "A product"} warranty expires in ${reminder.days_before} days`;
      const appUrl = Deno.env.get("APP_URL");
      const itemUrl = appUrl
        ? `${appUrl.replace(/\/$/, "")}/?item=${encodeURIComponent(reminder.item_id)}&claim=1`
        : "";
      const receiptPath = Array.isArray(item?.receipts)
        ? item.receipts[0]?.file_url
        : null;
      const { data: receiptLink } = receiptPath
        ? await db.storage
            .from("receipts")
            .createSignedUrl(receiptPath, 7 * 24 * 60 * 60)
        : { data: null };
      const cta = itemUrl
        ? `<p><a href="${escapeHtml(itemUrl)}" style="display:inline-block;padding:12px 18px;background:#286747;color:#fff;text-decoration:none;border-radius:8px">Prepare a claim</a></p>`
        : "";
      const receipt = receiptLink?.signedUrl
        ? `<p><a href="${escapeHtml(receiptLink.signedUrl)}">View your receipt (link expires in 7 days)</a></p>`
        : "";
      const html = `<p>Your warranty reminder</p><p><strong>${escapeHtml(item?.name || "Your item")}</strong>${item?.brand ? ` by ${escapeHtml(item.brand)}` : ""} expires on <strong>${escapeHtml(item?.warranty_end || "")}</strong>.</p>${cta}${receipt}<p>Open WarrantyVault to review your purchase details.</p>`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [email], subject, html }),
      });
      if (response.ok) {
        await db
          .from("reminders")
          .update({ status: "sent", processing_at: null })
          .eq("id", reminder.id);
        sent++;
      } else {
        await db
          .from("reminders")
          .update({ status: "failed", processing_at: null })
          .eq("id", reminder.id);
        failed++;
      }
    } catch {
      await db
        .from("reminders")
        .update({ status: "failed", processing_at: null })
        .eq("id", reminder.id);
      failed++;
    }
  }
  return Response.json(
    { processed: sent + skipped + failed, sent, skipped, failed },
    { headers: cors },
  );
});
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ]!,
  );
}
