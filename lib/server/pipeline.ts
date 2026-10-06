import "server-only";
import { supabase } from "@/lib/supabase";
import type { PipelineGame } from "@/lib/pipeline";

export const PIPELINE_GAME_FIELDS = "id,title,slug,status,cover_url,steam_vertical_cover,wide_cover_url,hero_url,platform,genres,hours_played";

export async function getPipeline(): Promise<PipelineGame[]> {
  const { data, error } = await supabase.from("game_pipeline")
    .select(`position, games!inner(${PIPELINE_GAME_FIELDS})`).order("position");
  if (error) throw new Error("Unable to load your pipeline. Please try again.");
  return (data || []).flatMap((row) => row.games) as unknown as PipelineGame[];
}
