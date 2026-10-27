import { designCss, fontsHref, type SiteDesign } from "@/lib/site-design";

/** An author's colours and fonts over the house look. Renders nothing for the publisher site. */
export function SiteDesignStyle({ design }: { design?: SiteDesign | null }) {
  const css = designCss(design);
  const href = fontsHref(design);
  if (!css && !href) return null;
  return (
    <>
      {href && <link rel="stylesheet" href={href} />}
      {css && <style>{css}</style>}
    </>
  );
}
