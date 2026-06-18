type IgdbGame = {
  id: number;
  name: string;
  cover?: {
    image_id: string;
  };
};

async function getIgdbToken() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    {
      method: "POST",
      cache: "no-store",
    }
  );

  const data = await response.json();
  return data.access_token;
}

export async function getIgdbGame(title: string): Promise<IgdbGame | null> {
  const clientId = process.env.IGDB_CLIENT_ID;
  const token = await getIgdbToken();

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId!,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: `
      search "${title}";
      fields name, cover.image_id;
      limit 1;
    `,
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data?.[0] ?? null;
}

export function getIgdbCoverUrl(imageId?: string) {
  if (!imageId) return null;

  return `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${imageId}.jpg`;
}