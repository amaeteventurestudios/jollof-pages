/** A chapter or book background is either a library id ("bg:kente") or an uploaded image URL. */
export function isLibraryBackground(v: string | undefined): v is string {
  return !!v && v.startsWith("bg:");
}

export function libraryId(v: string): string {
  return v.slice(3);
}
