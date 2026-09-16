export async function relationshipRequest(
  body: Record<string, unknown>,
  method = "POST",
) {
  const response = await fetch("/api/admin/relationships", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
