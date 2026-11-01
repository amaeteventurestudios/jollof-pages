/**
 * Interior typefaces. Every family is SIL OFL 1.1 from Google Fonts. The print PDF needs the TTF
 * files (scripts/fonts.txt lists the same families for scripts/setup-tools.sh); the Desk preview
 * and the public reader load them from Google Fonts; EPUBs name them with fallbacks.
 */

export type FontRole = "serif" | "sans" | "display" | "script" | "hand" | "mono" | "symbol";

export interface BookFont {
  family: string;
  role: FontRole;
  /** CSS fallback after the family itself */
  fallback: string;
  /** Google Fonts css2 axis spec, e.g. "ital,wght@0,400;0,700;1,400" */
  axes: string;
  /** file name prefix in ./fonts */
  file: string;
}

const SERIF = "Georgia, serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";
const B = "ital,wght@0,400;0,700;1,400";
const W = "wght@400;700";

export const FONTS: BookFont[] = [
  { family: "EB Garamond", role: "serif", fallback: `Garamond, ${SERIF}`, axes: "ital,wght@0,400;0,600;0,700;1,400;1,600", file: "EBGaramond" },
  { family: "Literata", role: "serif", fallback: SERIF, axes: B, file: "Literata" },
  { family: "Source Serif 4", role: "serif", fallback: SERIF, axes: B, file: "SourceSerif4" },
  { family: "Crimson Pro", role: "serif", fallback: SERIF, axes: B, file: "CrimsonPro" },
  { family: "Lora", role: "serif", fallback: SERIF, axes: B, file: "Lora" },
  { family: "Libre Baskerville", role: "serif", fallback: `Baskerville, ${SERIF}`, axes: "ital,wght@0,400;0,700;1,400", file: "LibreBaskerville" },
  { family: "Merriweather", role: "serif", fallback: SERIF, axes: B, file: "Merriweather" },
  { family: "Alegreya", role: "serif", fallback: SERIF, axes: B, file: "Alegreya" },
  { family: "Spectral", role: "serif", fallback: SERIF, axes: B, file: "Spectral" },
  { family: "Cardo", role: "serif", fallback: SERIF, axes: B, file: "Cardo" },
  { family: "Cormorant Garamond", role: "serif", fallback: `Garamond, ${SERIF}`, axes: B, file: "CormorantGaramond" },
  { family: "Newsreader", role: "serif", fallback: SERIF, axes: B, file: "Newsreader" },
  { family: "Gelasio", role: "serif", fallback: SERIF, axes: B, file: "Gelasio" },
  { family: "PT Serif", role: "serif", fallback: SERIF, axes: B, file: "PTSerif" },
  { family: "Vollkorn", role: "serif", fallback: SERIF, axes: B, file: "Vollkorn" },
  { family: "Old Standard TT", role: "serif", fallback: SERIF, axes: B, file: "OldStandardTT" },
  { family: "IM Fell English", role: "serif", fallback: SERIF, axes: "ital@0;1", file: "IMFellEnglish" },
  { family: "Andika", role: "sans", fallback: SANS, axes: B, file: "Andika" },
  { family: "Playfair Display", role: "display", fallback: SERIF, axes: B, file: "PlayfairDisplay" },
  { family: "Fraunces", role: "display", fallback: SERIF, axes: B, file: "Fraunces" },
  { family: "DM Serif Display", role: "display", fallback: SERIF, axes: "ital@0;1", file: "DMSerifDisplay" },
  { family: "Bodoni Moda", role: "display", fallback: `Didot, ${SERIF}`, axes: B, file: "BodoniModa" },
  { family: "Cinzel", role: "display", fallback: SERIF, axes: W, file: "Cinzel" },
  { family: "Abril Fatface", role: "display", fallback: SERIF, axes: "wght@400", file: "AbrilFatface" },
  { family: "Cormorant SC", role: "display", fallback: SERIF, axes: W, file: "CormorantSC" },
  { family: "Inter", role: "sans", fallback: SANS, axes: "wght@400;600;700", file: "Inter" },
  { family: "Montserrat", role: "sans", fallback: SANS, axes: B, file: "Montserrat" },
  { family: "Poppins", role: "sans", fallback: SANS, axes: B, file: "Poppins" },
  { family: "Josefin Sans", role: "sans", fallback: SANS, axes: B, file: "JosefinSans" },
  { family: "Raleway", role: "sans", fallback: SANS, axes: B, file: "Raleway" },
  { family: "Oswald", role: "sans", fallback: SANS, axes: W, file: "Oswald" },
  { family: "Bebas Neue", role: "display", fallback: SANS, axes: "wght@400", file: "BebasNeue" },
  { family: "Space Grotesk", role: "sans", fallback: SANS, axes: W, file: "SpaceGrotesk" },
  { family: "Nunito", role: "sans", fallback: SANS, axes: B, file: "Nunito" },
  { family: "Fredoka", role: "display", fallback: SANS, axes: W, file: "Fredoka" },
  { family: "Great Vibes", role: "script", fallback: "cursive", axes: "wght@400", file: "GreatVibes" },
  { family: "Caveat", role: "hand", fallback: "cursive", axes: W, file: "Caveat" },
  { family: "Kalam", role: "hand", fallback: "cursive", axes: W, file: "Kalam" },
  { family: "Reenie Beanie", role: "hand", fallback: "cursive", axes: "wght@400", file: "ReenieBeanie" },
  { family: "Indie Flower", role: "hand", fallback: "cursive", axes: "wght@400", file: "IndieFlower" },
  { family: "Patrick Hand", role: "hand", fallback: "cursive", axes: "wght@400", file: "PatrickHand" },
  { family: "Shadows Into Light", role: "hand", fallback: "cursive", axes: "wght@400", file: "ShadowsIntoLight" },
  { family: "Gloria Hallelujah", role: "hand", fallback: "cursive", axes: "wght@400", file: "GloriaHallelujah" },
  { family: "Dancing Script", role: "script", fallback: "cursive", axes: W, file: "DancingScript" },
  { family: "Special Elite", role: "mono", fallback: "'Courier New', monospace", axes: "wght@400", file: "SpecialElite" },
  { family: "Courier Prime", role: "mono", fallback: "'Courier New', monospace", axes: B, file: "CourierPrime" },
  // emoji in print, as line drawings (colour emoji are left to ebook readers)
  { family: "Noto Emoji", role: "symbol", fallback: "sans-serif", axes: "wght@400", file: "NotoEmoji" },
];

export function fontByFamily(family: string): BookFont | undefined {
  return FONTS.find((f) => f.family === family);
}

export function fontCss(family: string): string {
  const f = fontByFamily(family);
  return `'${family}', ${f?.fallback ?? SERIF}`;
}

/** Fonts for special blocks: handwriting, typewriter and so on. */
export const HAND_FONT = "Caveat";
export const TYPEWRITER_FONT = "Special Elite";

/** Google Fonts stylesheets for every interior family (split so each URL stays short). */
export const FONT_HREFS: string[] = (() => {
  const out: string[] = [];
  for (let i = 0; i < FONTS.length; i += 14) {
    const fams = FONTS.slice(i, i + 14).map((f) => `family=${f.family.replace(/ /g, "+")}:${f.axes}`);
    out.push(`https://fonts.googleapis.com/css2?${fams.join("&")}&display=swap`);
  }
  return out;
})();
