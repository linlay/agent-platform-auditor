export async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(
    path,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  if (!r.ok) throw Error(await r.text());
  return r.json() as Promise<T>;
}
export function download(data: unknown, name: string) {
  downloadFile(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), name);
}
export function downloadFile(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
