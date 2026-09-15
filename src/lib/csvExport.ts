type ReportTable = {
  title: string;
  headers: string[];
  rows: string[][];
};

const labels: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Dinheiro",
  digital_wallet: "Carteira digital",
  investment: "Investimentos",
  other: "Outra",
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
  card_payment: "Pagamento de fatura",
  confirmed: "Confirmada",
  pending: "Pendente",
  overdue: "Em atraso",
  cancelled: "Cancelada",
  active: "Ativa",
  inactive: "Inativa",
  true: "Sim",
  false: "Não",
};

function escapeHtml(value: unknown) {
  return String(value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readable(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  return labels[text] ?? text;
}

function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount)
    : "—";
}

function date(value: unknown) {
  const text = String(value ?? "");
  if (!text) return "—";
  const parsed = new Date(`${text}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? readable(text) : new Intl.DateTimeFormat("pt-BR").format(parsed);
}

function createTables(rows: Array<Array<unknown>>): ReportTable[] {
  const tables = new Map<string, ReportTable>();
  const ensure = (title: string, headers: string[]) => {
    const existing = tables.get(title);
    if (existing) return existing;
    const table = { title, headers, rows: [] };
    tables.set(title, table);
    return table;
  };

  rows.forEach((row) => {
    const type = String(row[0] ?? "");
    if (type === "Conta") {
      ensure("Contas", ["Nome", "Instituição", "Tipo", "Saldo inicial", "Arquivada"]).rows.push(
        [readable(row[2]), readable(row[3]), readable(row[4]), money(row[5]), readable(row[8])],
      );
    } else if (type === "Cartão de crédito") {
      ensure("Cartões de crédito", ["Nome", "Instituição", "Bandeira", "Limite", "Fechamento", "Vencimento", "Arquivado"]).rows.push(
        [readable(row[2]), readable(row[3]), readable(row[4]), money(row[5]), readable(row[6]), readable(row[7]), readable(row[8])],
      );
    } else if (type === "Cartão de débito") {
      ensure("Cartões de débito", ["Nome", "Instituição", "Bandeira", "Conta vinculada", "Arquivado"]).rows.push(
        [readable(row[2]), readable(row[3]), readable(row[4]), "Conta cadastrada", readable(row[8])],
      );
    } else if (type === "Movimentação") {
      ensure("Movimentações", ["Descrição", "Tipo", "Status", "Valor", "Data", "Situação", "Observações"]).rows.push(
        [readable(row[2]), readable(row[3]), readable(row[4]), money(row[5]), date(row[6]), readable(row[7]), readable(row[9])],
      );
    } else if (type === "Orçamento") {
      ensure("Orçamentos", ["Categoria", "Início do período", "Limite"]).rows.push(
        ["Categoria cadastrada", date(row[3]), money(row[5])],
      );
    } else if (type === "Meta") {
      ensure("Metas", ["Meta", "Status", "Data alvo", "Valor desejado"]).rows.push(
        [readable(row[2]), readable(row[3]), date(row[4]), money(row[5])],
      );
    } else if (type === "Aporte de meta") {
      ensure("Aportes em metas", ["Meta", "Valor", "Data", "Observações"]).rows.push(
        ["Meta cadastrada", money(row[5]), date(row[3]), readable(row[9])],
      );
    } else if (type === "Recorrência") {
      ensure("Recorrências", ["Descrição", "Tipo", "Frequência", "Valor", "Próxima ocorrência", "Ativa"]).rows.push(
        [readable(row[2]), readable(row[3]), readable(row[4]), money(row[5]), date(row[6]), readable(row[7])],
      );
    }
  });

  return [...tables.values()];
}

export function createCsvFile(filename: string, _headers: string[], rows: Array<Array<unknown>>) {
  const tables = createTables(rows);
  const sections = tables
    .map(
      (table) => `<section><h2>${escapeHtml(table.title)}</h2><div class="table-wrap"><table><thead><tr>${table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`,
    )
    .join("");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Backup das finanças</title><style>
  :root{--primary:#0F766E;--ink:#0F172A;--muted:#64748B;--line:#E2E8F0;--soft:#F8FAFC}*{box-sizing:border-box}body{margin:0;background:var(--soft);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.45}main{max-width:1180px;margin:0 auto;padding:28px 18px 48px}header{background:linear-gradient(135deg,#0F766E,#115E59);color:#fff;padding:30px;border-radius:18px;box-shadow:0 12px 30px rgba(15,118,110,.18)}h1{margin:0;font-size:clamp(25px,6vw,38px)}header p{margin:8px 0 0;opacity:.88}section{margin-top:24px;background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 3px 12px rgba(15,23,42,.04)}h2{margin:0;padding:17px 20px;font-size:20px;background:#F0FDFA;color:#115E59}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:600px;font-size:14px}th{background:var(--primary);color:#fff;text-align:left;padding:12px 14px;white-space:nowrap}td{padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}tbody tr:nth-child(even){background:#FAFEFD}tbody tr:last-child td{border-bottom:0}footer{margin-top:24px;color:var(--muted);font-size:13px;text-align:center}@media print{body{background:#fff}main{max-width:none;padding:0}header{box-shadow:none}section{break-inside:avoid;box-shadow:none}}
  </style></head><body><main><header><h1>Backup das suas finanças</h1><p>Gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}</p></header>${sections || '<section><h2>Sem dados</h2></section>'}<footer>Arquivo gerado pelo aplicativo Finanças. Valores em reais (R$).</footer></main></body></html>`;

  return new File([html], filename, { type: "text/html;charset=utf-8" });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function saveCsvFile(file: File) {
  const shareData = {
    files: [file],
    title: "Backup das finanças",
    text: "Backup dos seus dados financeiros.",
  };

  if (
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare(shareData))
  ) {
    await navigator.share(shareData);
    return "shared" as const;
  }

  downloadFile(file);
  return "downloaded" as const;
}

export function localFileDate() {
  return new Date().toISOString().slice(0, 10);
}
