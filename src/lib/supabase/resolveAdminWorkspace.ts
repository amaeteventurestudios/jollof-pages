// SERVER-ONLY — never import from client components
import { cache } from 'react';
import { getAdminClient } from './admin';

/**
 * Returns the workspace ID to use for admin panels.
 *
 * Resolution order:
 *   1. DEMO_WORKSPACE_ID env var (explicit override)
 *   2. First active workspace found in the database
 *   3. null — schema not applied or no workspace exists yet
 *
 * Result is cached per React request tree (React.cache).
 */
export const resolveAdminWorkspaceId = cache(async (): Promise<string | null> => {
  if (process.env.DEMO_WORKSPACE_ID) return process.env.DEMO_WORKSPACE_ID;

  try {
    const db = getAdminClient();
    const { data, error } = await db
      .from('workspaces')
      .select('id')
      .eq('is_active', true)
      .order('created_at')
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
});
