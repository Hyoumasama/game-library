export type Asset = {
  id: number;
  type: string;
  category: string | null;
  name: string;
  brand: string | null;
  purchase_date: string | null;
  price: string | null;
  market: string | null;
  image_url: string | null;
  status: string | null;
  notes: string | null;
};

export type AssetFormValues = {
  type: string;
  category: string;
  name: string;
  brand: string;
  purchaseDate: string;
  price: string;
  market: string;
  imageUrl: string;
  status: string;
  notes: string;
};

const optionalString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

export function buildAssetPayload(body: unknown) {
  if (!body || typeof body !== "object") throw new Error("Invalid request body");

  const values = body as Record<string, unknown>;
  const name = optionalString(values.name);
  const type = optionalString(values.type);

  if (!name) throw new Error("Name is required");
  if (!type) throw new Error("Type is required");

  return {
    type,
    category: optionalString(values.category),
    name,
    brand: optionalString(values.brand),
    purchase_date: optionalString(values.purchaseDate),
    price: optionalString(values.price),
    market: optionalString(values.market),
    image_url: optionalString(values.imageUrl),
    status: optionalString(values.status),
    notes: optionalString(values.notes),
  };
}

export function assetToFormValues(asset?: Asset): AssetFormValues {
  return {
    type: asset?.type || "Hardware",
    category: asset?.category || "",
    name: asset?.name || "",
    brand: asset?.brand || "",
    purchaseDate: asset?.purchase_date || new Date().toISOString().slice(0, 10),
    price: asset?.price || "",
    market: asset?.market || "",
    imageUrl: asset?.image_url || "",
    status: asset?.status || "Owned",
    notes: asset?.notes || "",
  };
}
