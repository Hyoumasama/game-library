function formatSteamDate(dateText: string) {
  const months: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };

  const match =
  dateText.match(/^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/) ||
  dateText.match(/^(\d{1,2}) ([A-Za-z]{3}), (\d{4})$/);

  if (!match) return "";

  let day = "";
let month = "";
let year = "";

if (months[match[1]]) {
  month = months[match[1]];
  day = match[2].padStart(2, "0");
  year = match[3];
} else {
  day = match[1].padStart(2, "0");
  month = months[match[2]];
  year = match[3];
}

  if (!month) return "";

  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return Response.json({ results: [] });
    }

    const searchResponse = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
        query
      )}&l=en&cc=US`,
      { cache: "no-store" }
    );

    const searchData = await searchResponse.json();
    const items = searchData.items || [];

    const results = await Promise.all(
      items.slice(0, 10).map(async (item: any) => {
        const appid = item.id;

        const detailResponse = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${appid}&l=en&cc=US`,
          { cache: "no-store" }
        );

        const detailData = await detailResponse.json();
        const data = detailData?.[appid]?.data;

        const steamDate = data?.release_date?.date || "";

        return {
          source: "steam",
          steamAppId: appid,
          igdbId: null,
          title: item.name,
          year: steamDate ? Number(steamDate.split(", ").pop()) : null,
          releaseDate: formatSteamDate(steamDate),
steamReleaseText: steamDate,
          coverUrl: data?.capsule_image || item.tiny_image || null,
          heroUrl: data?.header_image || data?.capsule_image || null,
          summary: data?.short_description || "",
          genre:
            data?.genres?.map((g: any) => g.description).join(", ") || "",
          developer: data?.developers?.join(", ") || "",
          publisher: data?.publishers?.join(", ") || "",
          screenshots:
            data?.screenshots?.map((s: any) => s.path_full).join(",") || "",
        };
      })
    );

    return Response.json({ results });
  } catch (error) {
    console.error("Steam search error:", error);
    return Response.json({ results: [], error: "Steam search failed" });
  }
}