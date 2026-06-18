export async function getRawgGame(title: string) {
  const apiKey = process.env.RAWG_API_KEY;

  if (!apiKey) {
    return null;
  }

  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(
    title
  )}&page_size=1`;

  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  return data.results?.[0] ?? null;
}