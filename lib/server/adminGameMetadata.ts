import { supabase } from "@/lib/supabase";
import type { AdminGameMetadataInput } from "@/lib/server/adminGamePayload";

export async function syncAdminGameMetadata(gameId: number, input: AdminGameMetadataInput) {
  const { data, error } = await supabase.rpc("sync_admin_game_metadata", {
    p_game_id: gameId,
    p_franchise: input.franchise,
    p_relationships: input.relationships,
  });
  if (error) throw error;
  return data as string;
}
