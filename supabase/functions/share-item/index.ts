import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: cors });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer "))
    return json({ error: "Sign in required" }, 401);
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !anonKey || !serviceKey)
    return json({ error: "Sharing is not configured" }, 503);
  const caller = createClient(projectUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await caller.auth.getUser();
  if (authError || !user)
    return json({ error: "Your session is invalid. Sign in again." }, 401);
  const { itemId, email, permission } = await request.json();
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    return json({ error: "Enter a valid email address" }, 400);
  if (!/^[0-9a-f-]{36}$/i.test(String(itemId || "")))
    return json({ error: "Invalid item" }, 400);
  if (!["viewer", "editor"].includes(permission))
    return json({ error: "Choose viewer or editor access" }, 400);
  const admin = createClient(projectUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { data: item, error: itemError } = await admin
    .from("items")
    .select("id,user_id,name")
    .eq("id", itemId)
    .maybeSingle();
  if (itemError || !item || item.user_id !== user.id)
    return json({ error: "Only the item owner can share this item" }, 403);
  let target: { id: string; email?: string } | undefined;
  for (let page = 1; page <= 20 && !target; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) return json({ error: "Could not find that account" }, 502);
    target = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
    );
    if (data.users.length < 1000) break;
  }
  if (!target)
    return json(
      {
        error:
          "That person needs a WarrantyVault account before you can share an item",
      },
      404,
    );
  if (target.id === user.id)
    return json({ error: "You already own this item" }, 400);
  const { error: shareError } = await admin.from("item_shares").upsert(
    {
      item_id: item.id,
      owner_id: user.id,
      shared_with_user_id: target.id,
      shared_email: target.email || normalizedEmail,
      permission,
    },
    { onConflict: "item_id,shared_with_user_id" },
  );
  if (shareError) return json({ error: shareError.message }, 500);
  const appUrl = Deno.env.get("APP_URL");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  const notificationConfigured = Boolean(
    appUrl && resendKey && from && target.email,
  );
  let notificationSent = false;
  if (notificationConfigured) {
    try {
      const link = `${appUrl.replace(/\/$/, "")}/?item=${encodeURIComponent(item.id)}`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [target.email],
          subject: `A WarrantyVault item was shared with you`,
          html: `<p>${escapeHtml(user.email || "A family member")} shared <strong>${escapeHtml(item.name)}</strong> with you as a ${permission}.</p><p><a href="${escapeHtml(link)}">Open shared item</a></p>`,
        }),
      });
      notificationSent = response.ok;
    } catch {
      notificationSent = false;
    }
  }
  return json({
    ok: true,
    permission,
    email: target.email,
    notificationSent,
    notificationConfigured,
  });
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
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
