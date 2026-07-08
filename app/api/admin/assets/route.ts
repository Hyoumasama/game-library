import { supabase } from "@/lib/supabase";

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
  const body = await request.json();

  const name = body.name?.trim();

  if (!name) {
    return Response.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("library_assets")
    .insert({
      type: body.type,
      name,
      purchase_date: body.purchaseDate || null,
      price: body.price || null,
      market: body.market || null,
      image_url: body.imageUrl || null,
      notes: body.notes || null,
    });

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
  });
}
