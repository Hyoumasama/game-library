import "server-only";
import { isSteamAdultContent } from "@/lib/adultContent";

// One batched Steam call (IStoreBrowseService, no API key needed) returning
// which of the given app ids Steam marks as adult sexual content. Failures
// return an empty set - adult tagging is best effort and must never break
// a search.
export async function fetchSteamAdultAppIds(appIds: number[]) {
  const adultAppIds = new Set<number>();
  const ids = [...new Set(appIds.filter((id) => Number.isSafeInteger(id) && id > 0))];

  if (ids.length === 0) return adultAppIds;

  const input = {
    ids: ids.map((appid) => ({ appid })),
    context: { language: "english", country_code: "US", steam_realm: 1 },
    data_request: { include_basic_info: true },
  };

  try {
    const response = await fetch(
      `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(
        JSON.stringify(input)
      )}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) return adultAppIds;

    const data = (await response.json()) as {
      response?: {
        store_items?: { appid?: number; content_descriptorids?: number[] }[];
      };
    };

    for (const item of data.response?.store_items || []) {
      if (item.appid && isSteamAdultContent(item.content_descriptorids)) {
        adultAppIds.add(item.appid);
      }
    }
  } catch (error) {
    console.error("Steam adult content lookup failed:", error);
  }

  return adultAppIds;
}
