import { relationTypes, type RelationType } from "@/lib/relationships/model";
export function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new Error("Invalid game or record ID");
  return value;
}
export function text(value: unknown, max = 300): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new Error(`Text must contain 1?${max} characters`);
  return value.trim();
}
export function confidence(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  )
    throw new Error("Confidence must be between 0 and 1");
  return value;
}
export function relationType(value: unknown): RelationType {
  if (!relationTypes.includes(value as RelationType))
    throw new Error("Invalid relationship type");
  return value as RelationType;
}
export function relationshipPayload(body: Record<string, unknown>) {
  const source_game_id = uuid(body.source_game_id),
    target_game_id = uuid(body.target_game_id);
  if (source_game_id === target_game_id)
    throw new Error("A game cannot relate to itself");
  return {
    source_game_id,
    target_game_id,
    relation_type: relationType(body.relation_type),
    confidence: confidence(body.confidence),
    source: text(body.source || "manual", 100),
    notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : null,
  };
}
