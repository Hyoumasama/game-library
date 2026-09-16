import { buildAssetPayload } from "@/lib/assets";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assetId = Number(id);

  if (!Number.isSafeInteger(assetId) || assetId <= 0) {
    return Response.json({ error: "Invalid asset id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  let payload: ReturnType<typeof buildAssetPayload>;

  try {
    payload = buildAssetPayload(body);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid payload" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("library_assets")
    .update(payload)
    .eq("id", assetId)
    .select("*")
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Asset not found" }, { status: 404 });

  return Response.json({ asset: data });
}
