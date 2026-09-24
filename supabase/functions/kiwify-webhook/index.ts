import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;
type SubscriptionStatus = "active" | "past_due" | "cancelled";
type BillingPlanCode = "lifetime" | "pro_monthly" | "pro_annual";

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

  if (["compra_aprovada", "order_approved", "subscription_renewed"].includes(normalized)) {
    return "active";
  }
  if (["subscription_late", "subscription_overdue"].includes(normalized)) return "past_due";
  if ([
    "subscription_canceled",
    "subscription_cancelled",
    "compra_reembolsada",
    "order_refunded",
    "chargeback",
  ].includes(normalized)) {
    return "cancelled";
  }

  const normalizedOrderStatus = orderStatus?.toLowerCase();
  if (["paid", "approved", "aprovado"].includes(normalizedOrderStatus ?? "")) return "active";

  return null;
}

function asMoney(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^0-9,.-]/g, "");
  if (!cleaned) return null;

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function leafValues(value: unknown, depth = 0): Array<string | number> {
  if (typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) {
    return [value];
  }
  if (depth >= 4 || !value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.values(asRecord(value)).flatMap((item) => leafValues(item, depth + 1));
}

function firstValidDate(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) return date.toISOString();
  }
  return null;
}

function inferPlan(payload: JsonRecord): BillingPlanCode | null {
  const textCandidates = [
    at(payload, ["Subscription", "plan_name"]),
    at(payload, ["Subscription", "name"]),
    at(payload, ["Subscription", "plan", "name"]),
    at(payload, ["Subscription", "plan"]),
    at(payload, ["subscription", "plan_name"]),
    at(payload, ["subscription", "name"]),
    at(payload, ["subscription", "plan", "name"]),
    at(payload, ["subscription", "plan"]),
    at(payload, ["Product", "product_name"]),
    at(payload, ["Product", "name"]),
    at(payload, ["product", "product_name"]),
    at(payload, ["product", "name"]),
    at(payload, ["Offer", "name"]),
    at(payload, ["offer", "name"]),
    at(payload, ["Order", "offer_name"]),
    at(payload, ["Order", "product_name"]),
    at(payload, ["order", "offer_name"]),
    at(payload, ["order", "product_name"]),
    payload.plan_name,
    payload.offer_name,
    payload.product_name,
  ];

  const details = [
    ...textCandidates.filter((value): value is string => typeof value === "string"),
    ...leafValues(at(payload, ["Subscription", "plan"])).filter((value): value is string => typeof value === "string"),
    ...leafValues(at(payload, ["subscription", "plan"])).filter((value): value is string => typeof value === "string"),
  ]
    .join(" ")
    .toLowerCase();

  if (details.includes("vitalício") || details.includes("vitalicio") || details.includes("lifetime")) return "lifetime";
  if (details.includes("anual") || details.includes("annual")) return "pro_annual";
  if (details.includes("mensal") || details.includes("monthly")) return "pro_monthly";

  const moneyCandidates = [
    at(payload, ["Subscription", "price"]),
    at(payload, ["Subscription", "plan"]),
    at(payload, ["subscription", "price"]),
    at(payload, ["subscription", "plan"]),
    at(payload, ["Offer", "price"]),
    at(payload, ["offer", "price"]),
    at(payload, ["Order", "total"]),
    at(payload, ["Order", "price"]),
    at(payload, ["Order", "value"]),
    at(payload, ["order", "total"]),
    at(payload, ["order", "price"]),
    at(payload, ["order", "value"]),
    payload.order_amount,
    payload.order_value,
    payload.amount,
    payload.price,
    payload.total,
  ]
    .map(asMoney)
    .filter((value): value is number => value !== null);

  if (moneyCandidates.some((value) => Math.abs(value - 49.9) < 0.01)) return "lifetime";
  if (moneyCandidates.some((value) => Math.abs(value - 149.9) < 0.01)) return "pro_annual";
  if (moneyCandidates.some((value) => Math.abs(value - 14.9) < 0.01)) return "pro_monthly";
  return null;
}

function nextPeriod(planCode: BillingPlanCode | null): string | null {
  if (!planCode || planCode === "lifetime") return null;
  const next = new Date();
  if (planCode === "pro_annual") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

function currentPeriodEnd(
  payload: JsonRecord,
  planCode: BillingPlanCode | null,
): string | null {
  if (planCode === "lifetime") return null;

  const providerDate = firstValidDate(
    ...leafValues(at(payload, ["Subscription", "next_payment"])),
    ...leafValues(at(payload, ["subscription", "next_payment"])),
  );
  return providerDate ?? nextPeriod(planCode);
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

  const { data: insertedEvent, error: insertError } = await supabase
    .from("billing_webhook_events")
    .insert({
      event_key: eventKey,
      provider_event_id: providerEventId,
      event_type: eventType,
      external_subscription_id: externalSubscriptionId,
    })
    .select("id")
    .single();

  let eventId = insertedEvent?.id;
  const replayed = insertError?.code === "23505";

  if (replayed) {
    const { data: existingEvent, error: existingEventError } = await supabase
      .from("billing_webhook_events")
      .select("id")
      .eq("event_key", eventKey)
      .single();

    if (existingEventError || !existingEvent) {
      console.error("Unable to load duplicate Kiwify webhook event");
      return json({ error: "event_registration_failed" }, 500);
    }

    eventId = existingEvent.id;
  } else if (insertError || !eventId) {
    console.error("Unable to register Kiwify webhook event", insertError?.message ?? "unknown_error");
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
        .eq("id", eventId);

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
        .eq("id", eventId);

      return json({ received: true, ignored: true });
    }

    const inferredPlanCode = inferPlan(payload);
    const { data: currentSubscription, error: currentSubscriptionError } = await supabase
      .from("billing_subscriptions")
      .select("plan_code")
      .eq("user_id", userId)
      .maybeSingle();

    if (currentSubscriptionError) throw currentSubscriptionError;

    const planCode = inferredPlanCode ?? currentSubscription?.plan_code ?? null;
    if (!planCode && newStatus === "active") {
      console.info("Kiwify plan could not be inferred", JSON.stringify({
        topLevelKeys: Object.keys(payload).sort(),
        subscriptionKeys: Object.keys(asRecord(payload.Subscription ?? payload.subscription)).sort(),
        orderKeys: Object.keys(asRecord(payload.Order ?? payload.order)).sort(),
        productKeys: Object.keys(asRecord(payload.Product ?? payload.product)).sort(),
        offerKeys: Object.keys(asRecord(payload.Offer ?? payload.offer)).sort(),
        subscriptionPlanType: typeof at(payload, ["Subscription", "plan"]),
        subscriptionPlanKeys: Object.keys(asRecord(at(payload, ["Subscription", "plan"]))).sort(),
        nextPaymentType: typeof at(payload, ["Subscription", "next_payment"]),
        nextPaymentKeys: Object.keys(asRecord(at(payload, ["Subscription", "next_payment"]))).sort(),
      }));
    }

    const update = {
      provider: "kiwify",
      status: newStatus,
      plan_code: planCode,
      external_subscription_id: externalSubscriptionId,
      last_provider_event_at: new Date().toISOString(),
      cancel_at_period_end: newStatus === "cancelled",
      current_period_ends_at: newStatus === "active" ? currentPeriodEnd(payload, planCode) : null,
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
      .eq("id", eventId);

    if (eventUpdateError) throw eventUpdateError;

    return json({ received: true, replayed });
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
      .eq("id", eventId);

    return json({ error: "processing_error" }, 500);
  }
});
