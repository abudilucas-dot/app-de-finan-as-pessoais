type Column = {
  header: string;
  key: string;
  format?: "currency" | "date";
};

export type ExportSection = {
  name: string;
  columns: Column[];
  rows: Record<string, unknown>[];
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatValue(value: unknown, column: Column) {
  if (value === null || value === undefined || value === "") return "—";
  if (column.format === "currency") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
  }
  if (column.format === "date") {
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-BR").format(date);
  }
  return String(value);
}

export function createFinanceReportFile(
  filename: string,
  summary: Array<[string, string | number]>,
  sections: ExportSection[],
) {
  const summaryHtml = summary
    .map(([label, value]) => `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`)
    .join("");

  const sectionsHtml = sections
    .map((section) => {
      const headers = section.columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join("");
      const rows = section.rows.length
        ? section.rows
            .map(
              (row) =>
                `<tr>${section.columns
                  .map((column) => `<td>${escapeHtml(formatValue(row[column.key], column))}</td>`)
                  .join("")}</tr>`,
            )
            .join("")
        : `<tr><td class="empty" colspan="${section.columns.length}">Nenhum registro cadastrado.</td></tr>`;
      return `<section><h2>${escapeHtml(section.name)}</h2><div class="table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Backup das finanças</title>
<style>
  :root { color-scheme: light; --primary:#0F766E; --ink:#0F172A; --muted:#64748B; --line:#E2E8F0; --soft:#F8FAFC; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--soft); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; line-height:1.45; }
  main { max-width:1180px; margin:0 auto; padding:28px 18px 48px; }
  header { background:linear-gradient(135deg,#0F766E,#115E59); color:#fff; padding:30px; border-radius:18px; box-shadow:0 12px 30px rgba(15,118,110,.18); }
  h1 { margin:0; font-size:clamp(25px,6vw,38px); } header p { margin:8px 0 0; opacity:.88; }
  .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin:20px 0 32px; }
  .summary-card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px; box-shadow:0 3px 12px rgba(15,23,42,.04); }
  .summary-card span { display:block; color:var(--muted); font-size:13px; } .summary-card strong { display:block; margin-top:5px; color:var(--primary); font-size:19px; }
  section { margin-top:28px; background:#fff; border:1px solid var(--line); border-radius:16px; overflow:hidden; box-shadow:0 3px 12px rgba(15,23,42,.04); }
  h2 { margin:0; padding:18px 20px; font-size:20px; background:#F0FDFA; color:#115E59; }
  .table-wrap { overflow-x:auto; } table { width:100%; border-collapse:collapse; min-width:650px; font-size:14px; }
  th { background:var(--primary); color:#fff; text-align:left; padding:12px 14px; white-space:nowrap; }
  td { padding:12px 14px; border-bottom:1px solid var(--line); vertical-align:top; } tbody tr:nth-child(even) { background:#FAFEFD; } tbody tr:last-child td { border-bottom:0; }
  .empty { text-align:center; color:var(--muted); padding:22px; }
  footer { margin-top:24px; color:var(--muted); font-size:13px; text-align:center; }
  @media print { body { background:#fff; } main { max-width:none; padding:0; } header { box-shadow:none; } section { break-inside:avoid; box-shadow:none; } }
</style>
</head>
<body>
<main>
<header><h1>Backup das suas finanças</h1><p>Gerado em ${escapeHtml(new Date().toLocaleString("pt-BR"))}</p></header>
<div class="summary">${summaryHtml}</div>
${sectionsHtml}
<footer>Arquivo gerado pelo aplicativo Finanças. Valores em reais (R$).</footer>
</main>
</body>
</html>`;

  return new File([html], filename, { type: "text/html;charset=utf-8" });
}
