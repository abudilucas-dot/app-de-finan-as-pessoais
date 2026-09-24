import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;
type SubscriptionStatus = "active" | "past_due" | "cancelled";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};

const at = (value: unknown, path: string[]): unknown =>
  path.reduce<unknown>((current, key) => asRecord(current)[key], value);

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

async function hmacSha1(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function sha256(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function sameText(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function mapStatus(eventType: string, orderStatus: string | null): SubscriptionStatus | null {
  const normalized = eventType.toLowerCase();

  if (["compra_aprovada", "subscription_renewed"].includes(normalized)) return "active";
  if (normalized === "subscription_late") return "past_due";
  if (["subscription_canceled", "compra_reembolsada", "chargeback"].includes(normalized)) {
    return "cancelled";
  }

  const normalizedOrderStatus = orderStatus?.toLowerCase();
  if (["paid", "approved", "aprovado"].includes(normalizedOrderStatus ?? "")) return "active";

  return null;
}

function inferPlan(payload: JsonRecord): "pro_monthly" | "pro_annual" | null {
  const details = [
    at(payload, ["Subscription", "plan_name"]),
    at(payload, ["Subscription", "name"]),
    at(payload, ["Product", "product_name"]),
    payload.plan_name,
    payload.offer_name,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (details.includes("anual") || details.includes("annual")) return "pro_annual";
  if (details.includes("mensal") || details.includes("monthly")) return "pro_monthly";
  return null;
}

function nextPeriod(planCode: "pro_monthly" | "pro_annual" | null): string | null {
  if (!planCode) return null;
  const next = new Date();
  if (planCode === "pro_annual") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

async function findUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const target = email.trim().toLowerCase();

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.trim().toLowerCase() === target);
    if (found) return found.id;
    if (data.users.length < 1000) return null;
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const webhookToken = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");
  if (!webhookToken) {
    console.error("KIWIFY_WEBHOOK_TOKEN is not configured");
    return json({ error: "webhook_not_configured" }, 503);
  }

  const signature = new URL(request.url).searchParams.get("signature");
  if (!signature) return json({ error: "invalid_signature" }, 401);

  const rawBody = await request.text();
  let payload: JsonRecord;
  try {
    payload = asRecord(JSON.parse(rawBody));
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const expectedFromRaw = await hmacSha1(webhookToken, rawBody);
  const expectedFromCanonicalJson = await hmacSha1(webhookToken, JSON.stringify(payload));

  if (!sameText(signature.toLowerCase(), expectedFromRaw) &&
      !sameText(signature.toLowerCase(), expectedFromCanonicalJson)) {
    return json({ error: "invalid_signature" }, 401);
  }

  const eventType = firstString(payload.webhook_event_type, payload.event_type, payload.event, payload.type) ?? "unknown";
  const orderStatus = firstString(payload.order_status, payload.status);
  const providerEventId = firstString(
    payload.order_id,
    at(payload, ["Order", "order_id"]),
    at(payload, ["Order", "id"]),
    at(payload, ["Subscription", "subscription_id"]),
    at(payload, ["Subscription", "id"]),
  );
  const externalSubscriptionId = firstString(
    at(payload, ["Subscription", "subscription_id"]),
    at(payload, ["Subscription", "id"]),
    payload.subscription_id,
  );
  const email = firstString(
    at(payload, ["Customer", "email"]),
    at(payload, ["customer", "email"]),
    payload.customer_email,
    payload.email,
  )?.toLowerCase() ?? null;

  const eventKey = providerEventId
    ? `kiwify:${eventType}:${providerEventId}`
    : `kiwify:${eventType}:${await sha256(rawBody)}`;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase service credentials are unavailable");
    return json({ error: "server_configuration_error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: event, error: insertError } = await supabase
    .from("billing_webhook_events")
    .insert({
      event_key: eventKey,
      provider_event_id: providerEventId,
      event_type: eventType,
      external_subscription_id: externalSubscriptionId,
    })
    .select("id")
    .single();

  if (insertError?.code === "23505") return json({ received: true, duplicate: true });
  if (insertError) {
    console.error("Unable to register Kiwify webhook event", insertError.message);
    return json({ error: "event_registration_failed" }, 500);
  }

  try {
    const newStatus = mapStatus(eventType, orderStatus);
    if (!newStatus || !email) {
      await supabase
        .from("billing_webhook_events")
        .update({
          processing_status: "ignored",
          failure_reason: !email ? "missing_customer_email" : "unsupported_event",
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      return json({ received: true, ignored: true });
    }

    const userId = await findUserIdByEmail(supabase, email);
    if (!userId) {
      await supabase
        .from("billing_webhook_events")
        .update({
          processing_status: "ignored",
          failure_reason: "no_matching_valune_user",
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      return json({ received: true, ignored: true });
    }

    const planCode = inferPlan(payload);
    const update = {
      provider: "kiwify",
      status: newStatus,
      plan_code: planCode,
      external_subscription_id: externalSubscriptionId,
      last_provider_event_at: new Date().toISOString(),
      cancel_at_period_end: newStatus === "cancelled",
      current_period_ends_at: newStatus === "active" ? nextPeriod(planCode) : null,
      updated_at: new Date().toISOString(),
    };

    const { error: subscriptionError } = await supabase
      .from("billing_subscriptions")
      .update(update)
      .eq("user_id", userId);

    if (subscriptionError) throw subscriptionError;

    const { error: eventUpdateError } = await supabase
      .from("billing_webhook_events")
      .update({
        processing_status: "processed",
        user_id: userId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (eventUpdateError) throw eventUpdateError;

    return json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 180) : "processing_error";
    console.error("Kiwify webhook processing failed", message);

    await supabase
      .from("billing_webhook_events")
      .update({
        processing_status: "failed",
        failure_reason: "processing_error",
        processed_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    return json({ error: "processing_error" }, 500);
  }
});
