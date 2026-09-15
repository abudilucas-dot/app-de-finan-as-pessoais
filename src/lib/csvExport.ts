export function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

export function createCsvFile(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(csvEscape).join(";")).join("\n");
  return new File([csv], filename, { type: "text/csv;charset=utf-8" });
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
