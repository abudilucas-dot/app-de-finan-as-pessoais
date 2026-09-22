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
  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) {
    return Response.json({ error: "Sessão inválida." }, { status: 401, headers: corsHeaders });
  }

  const body = await request.json().catch(() => ({}));
  if (body.confirmation !== "EXCLUIR MINHA CONTA") {
    return Response.json({ error: "Confirmação inválida." }, { status: 400, headers: corsHeaders });
  }

  const userId = user.id;
  const tables = [
    "notification_dismissals",
    "legal_acceptances",
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
    "user_settings",
    "profiles",
  ];

  for (const table of tables) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) {
      console.error("Failed deleting user data", { table, code: error.code });
      return Response.json({ error: "Não foi possível excluir a conta agora." }, { status: 500, headers: corsHeaders });
    }
  }

  const revokeResponse = await fetch(`${url}/auth/v1/logout?scope=global`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!revokeResponse.ok) {
    console.error("Failed revoking user sessions", { status: revokeResponse.status });
    return Response.json({ error: "Não foi possível encerrar as sessões da conta agora." }, { status: 500, headers: corsHeaders });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("Failed deleting auth user", { code: deleteError.status });
    return Response.json({ error: "Não foi possível excluir a conta agora." }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ deleted: true }, { headers: corsHeaders });
});
