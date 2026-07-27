import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase";

const allowedStatuses = new Set(["all", "pending", "matched", "skipped"]);
const allowedTypes = new Set(["all", "series", "movie", "ova"]);
const allowedSorts = new Set(["title_asc", "title_desc", "newest", "oldest"]);
const itemColumns = [
  "id",
  "source_key",
  "local_title",
  "local_type",
  "local_file_count",
  "local_season_count",
  "local_episode_count",
  "local_summary",
  "status",
  "matched_media_id",
  "notes",
  "matched_at",
  "created_at",
].join(", ");

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

function parsePositiveInteger(
  value: string | null,
  label: string,
  defaultValue: number
): { value: number; error?: never } | { value?: never; error: string } {
  if (!value) return { value: defaultValue };

  if (!/^\d+$/.test(value)) {
    return { error: `${label} must be a positive integer` };
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return { error: `${label} must be a positive integer` };
  }

  return { value: parsed };
}

function escapeIlikePattern(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

async function countWhere(column?: "status" | "local_type", value?: string) {
  let query = supabase
    .from("watch_import_items")
    .select("id", { count: "exact", head: true });

  if (column && value) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;

  if (error) throw error;

  return count || 0;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const isAdmin = await verifyAdminSessionValue(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );

  if (!isAdmin) {
    return jsonError("Admin authorization required", 401);
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();
  const status = searchParams.get("status") || "all";
  const type = searchParams.get("type") || "all";
  const sort = searchParams.get("sort") || "title_asc";
  const page = parsePositiveInteger(searchParams.get("page"), "page", 1);
  const pageSize = parsePositiveInteger(
    searchParams.get("pageSize"),
    "pageSize",
    25
  );

  if (search.length > 200) {
    return jsonError("search is too long", 400);
  }

  if (!allowedStatuses.has(status)) {
    return jsonError("status must be all, pending, matched, or skipped", 400);
  }

  if (!allowedTypes.has(type)) {
    return jsonError("type must be all, series, movie, or ova", 400);
  }

  if (!allowedSorts.has(sort)) {
    return jsonError(
      "sort must be title_asc, title_desc, newest, or oldest",
      400
    );
  }

  if (page.error) return jsonError(page.error, 400);
  if (pageSize.error) return jsonError(pageSize.error, 400);

  const currentPage = page.value || 1;
  const currentPageSize = pageSize.value || 25;

  if (currentPageSize > 100) {
    return jsonError("pageSize must be 100 or less", 400);
  }

  const from = (currentPage - 1) * currentPageSize;
  const to = from + currentPageSize - 1;

  try {
    let itemsQuery: any = supabase
      .from("watch_import_items")
      .select(itemColumns, { count: "exact" });

    if (search) {
      itemsQuery = itemsQuery.ilike(
        "local_title",
        `%${escapeIlikePattern(search)}%`
      );
    }

    if (status !== "all") {
      itemsQuery = itemsQuery.eq("status", status);
    }

    if (type !== "all") {
      itemsQuery = itemsQuery.eq("local_type", type);
    }

    if (sort === "title_asc") {
      itemsQuery = itemsQuery.order("local_title", { ascending: true });
    } else if (sort === "title_desc") {
      itemsQuery = itemsQuery.order("local_title", { ascending: false });
    } else if (sort === "newest") {
      itemsQuery = itemsQuery.order("created_at", { ascending: false });
    } else {
      itemsQuery = itemsQuery.order("created_at", { ascending: true });
    }

    const { data, count, error } = await itemsQuery
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const [
      all,
      pending,
      matched,
      skipped,
      series,
      movie,
      ova,
    ] = await Promise.all([
      countWhere(),
      countWhere("status", "pending"),
      countWhere("status", "matched"),
      countWhere("status", "skipped"),
      countWhere("local_type", "series"),
      countWhere("local_type", "movie"),
      countWhere("local_type", "ova"),
    ]);

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / currentPageSize);

    return Response.json({
      items: data || [],
      pagination: {
        page: currentPage,
        pageSize: currentPageSize,
        totalItems,
        totalPages,
      },
      counts: {
        all,
        pending,
        matched,
        skipped,
        series,
        movie,
        ova,
      },
    });
  } catch (error) {
    console.error("Watch import items list failed:", error);

    return jsonError("Watch import items list failed", 500);
  }
}
