// Typed Supabase client helper
// Once `supabase gen types typescript --linked` is run, replace this with generated types
// For now, use `any` to allow service code to compile without generated types

import { getAdminClient } from './admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTypedAdminClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getAdminClient() as any;
}
