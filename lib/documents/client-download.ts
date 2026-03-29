export async function downloadDocxFromApi(
  url: string,
  payload: unknown,
  fallbackFilename: string
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Download failed.");
  }

  const blob = await response.blob();

  const contentDisposition = response.headers.get("Content-Disposition");
  const match = contentDisposition?.match(/filename="(.+)"/);
  const filename = match?.[1] || fallbackFilename;

  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}