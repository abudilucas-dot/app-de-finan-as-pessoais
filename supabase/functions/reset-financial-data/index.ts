import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") {
    return Response.json({ error: "Método não permitido." }, { status: 405, headers: corsHeaders });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return Response.json({ error: "Sessão não encontrada." }, { status: 401, headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) {
    return Response.json({ error: "Sessão inválida." }, { status: 401, headers: corsHeaders });
  }

  const body = await request.json().catch(() => ({}));
  if (body.confirmation !== "RECOMEÇAR MINHA GESTÃO") {
    return Response.json({ error: "Confirmação inválida." }, { status: 400, headers: corsHeaders });
  }

  const userId = user.id;
  const tables = [
    "notification_dismissals",
    "debt_payments",
    "goal_contributions",
    "transactions",
    "credit_card_invoices",
    "debit_cards",
    "credit_cards",
    "recurring_rules",
    "budgets",
    "financial_goals",
    "financial_debts",
    "accounts",
    "categories",
  ];

  for (const table of tables) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) {
      console.error("Failed resetting financial data", { table, code: error.code });
      return Response.json(
        { error: "Não foi possível reiniciar os dados financeiros agora." },
        { status: 500, headers: corsHeaders },
      );
    }
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      monthly_income: null,
      payday: null,
      financial_objective: null,
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (profileError) {
    console.error("Failed resetting profile onboarding", { code: profileError.code });
    return Response.json(
      { error: "Os dados foram removidos, mas não foi possível reiniciar o onboarding." },
      { status: 500, headers: corsHeaders },
    );
  }

  return Response.json({ reset: true }, { headers: corsHeaders });
});
