import GameRelationships from "./GameRelationships";
import {
  canonicalIdForCopy,
  getRelationshipDetail,
} from "@/lib/server/relationships/data";
import type { RelationshipDetail } from "@/lib/relationships/model";
export default async function GameRelationshipsServer({
  gameId,
  canonicalId,
}: {
  gameId?: number;
  canonicalId?: string;
}) {
  let detail: RelationshipDetail | null = null;
  let id = canonicalId;
  let initialError = "";
  try {
    id = canonicalId || (gameId ? await canonicalIdForCopy(gameId) : undefined);
    detail = id ? await getRelationshipDetail(id) : null;
  } catch (error) {
    console.error(
      "Game relationships:",
      error instanceof Error ? error.message : "Unable to load related data",
    );
    initialError =
      "Connections are temporarily unavailable. Your game details are still available.";
  }
  return (
    <GameRelationships
      key={id || gameId}
      gameId={gameId}
      canonicalId={canonicalId}
      initialDetail={detail}
      initialError={initialError}
    />
  );
}
