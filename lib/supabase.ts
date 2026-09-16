import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const missingVariables = [
  !supabaseUrl && "SUPABASE_URL",
  !supabaseServiceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
].filter(Boolean);

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    `Missing Supabase configuration: ${missingVariables.join(", ")}. ` +
      "Set these variables in .env.local in the project root, then restart npm run dev."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);
