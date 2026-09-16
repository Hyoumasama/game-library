import { supabase } from "@/lib/supabase";
import { buildAssetPayload } from "@/lib/assets";

type AssetOptionRow = {
  type?: string | null;
  category?: string | null;
  brand?: string | null;
  market?: string | null;
  status?: string | null;
};

export async function GET() {
  const { data, error } = await supabase
    .from("library_assets")
    .select("type, category, brand, market, status")
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const unique = (key: keyof AssetOptionRow) =>
    Array.from(
      new Set(
        ((data || []) as AssetOptionRow[])
          .map((item) => item[key])
          .filter((value): value is string => Boolean(value))
      )
    ).sort();

  return Response.json({
    types: unique("type"),
    categories: unique("category"),
    brands: unique("brand"),
    markets: unique("market"),
    statuses: unique("status"),
  });
}

export async function POST(request: Request) {
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
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json({ asset: data }, { status: 201 });
}
