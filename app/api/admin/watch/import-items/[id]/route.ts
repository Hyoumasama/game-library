import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";
import { importItemColumns } from "@/lib/server/watch/manualMatch";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

function parseId(value: string) {
  if (!/^\d+$/.test(value)) return null;

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminSessionValue(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );

  if (!isAdmin) {
    return jsonError("Admin authorization required", 401);
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return jsonError("id must be a positive integer", 400);
  }

  const { data, error } = await supabase
    .from("watch_import_items")
    .select(importItemColumns)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return jsonError("Watch import item lookup failed", 500);
  }

  if (!data) {
    return jsonError("Watch import item not found", 404);
  }

  return Response.json({ item: data });
}
