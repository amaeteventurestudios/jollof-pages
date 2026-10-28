/**
 * How the writing surface looks to the author. Personal to this browser and separate from the
 * book's interior theme, which decides how the printed book and ebook look.
 */
export interface EditorSettings {
  /** "theme" writes in the book's own body font */
  font: string;
  /** px */
  size: number;
  lineHeight: number;
  paragraphs: "spaced" | "indented";
  justified: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = { font: "theme", size: 19, lineHeight: 1.7, paragraphs: "spaced", justified: false };

export const EDITOR_FONTS: { id: string; label: string; css: string }[] = [
  { id: "theme", label: "Book's own font", css: "" },
  { id: "literata", label: "Literata", css: "Literata, Georgia, serif" },
  { id: "garamond", label: "EB Garamond", css: "'EB Garamond', Garamond, serif" },
  { id: "lora", label: "Lora", css: "Lora, Georgia, serif" },
  { id: "source-serif", label: "Source Serif", css: "'Source Serif 4', Georgia, serif" },
  { id: "crimson", label: "Crimson Pro", css: "'Crimson Pro', Georgia, serif" },
  { id: "georgia", label: "Georgia", css: "Georgia, serif" },
  { id: "inter", label: "Inter (sans serif)", css: "Inter, system-ui, sans-serif" },
  { id: "system", label: "System sans serif", css: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: "mono", label: "Typewriter", css: "'Courier Prime', 'Courier New', ui-monospace, monospace" },
];

const KEY = "jp-editor-settings";

export function loadEditorSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_EDITOR_SETTINGS, ...(JSON.parse(raw) as Partial<EditorSettings>) } : DEFAULT_EDITOR_SETTINGS;
  } catch {
    return DEFAULT_EDITOR_SETTINGS;
  }
}

export function saveEditorSettings(s: EditorSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // private window: settings last for this visit only
  }
}

export function editorFontCss(s: EditorSettings, themeFont: string): string {
  return EDITOR_FONTS.find((f) => f.id === s.font)?.css || themeFont;
}
