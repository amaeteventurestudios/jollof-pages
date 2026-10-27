"use client";

import { forwardRef, useEffect, useState } from "react";
import { Group, Image as KImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import Konva from "konva";
import type { Book } from "@/lib/types";
import type { CoverGeometry } from "@/lib/kdp";

/** Layout units: 100 per inch. */
export const U = 100;

export interface CoverDesign {
  template: "bold" | "framed" | "photo" | "split" | "art";
  bg: string;
  fg: string;
  accent: string;
  font: string;
  titleSize: number; // relative to panel width
  imageUrl: string;
  title: { x: number; y: number };
  author: { x: number; y: number };
  backBg: string;
  showBlurb: boolean;
  /** a finished picture for the back panel, such as one made in an image tool */
  backImageUrl: string;
  spineBg: string;
  /** draw the title and author; off when the artwork already carries its own lettering */
  frontText: boolean;
}

export const COVER_FONTS = ["Playfair Display", "EB Garamond", "Archivo", "Inter", "Literata", "Crimson Pro", "Lora", "Source Serif 4"];
export const COVER_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wght@400;700;800&family=Crimson+Pro:wght@400;700&family=EB+Garamond:wght@400;600&family=Inter:wght@400;700;800&family=Literata:opsz,wght@7..72,400;7..72,700&family=Lora:wght@400;700&family=Playfair+Display:wght@400;700;900&family=Source+Serif+4:opsz,wght@8..60,400;8..60,700&display=swap";

export const TEMPLATES: { id: CoverDesign["template"]; label: string; design: Partial<CoverDesign> }[] = [
  { id: "bold", label: "Bold type", design: { bg: "#ad3a17", fg: "#ffffff", accent: "#f2c14e", font: "Archivo", titleSize: 0.14, title: { x: 0.09, y: 0.1 }, author: { x: 0.09, y: 0.88 } } },
  { id: "framed", label: "Framed", design: { bg: "#2b2622", fg: "#f4efe6", accent: "#c9a45c", font: "Playfair Display", titleSize: 0.11, title: { x: 0.5, y: 0.3 }, author: { x: 0.5, y: 0.82 } } },
  { id: "photo", label: "Photograph", design: { bg: "#1d1d1d", fg: "#ffffff", accent: "#ffffff", font: "Inter", titleSize: 0.12, title: { x: 0.08, y: 0.66 }, author: { x: 0.08, y: 0.9 } } },
  { id: "art", label: "Your artwork", design: { bg: "#1d1d1d", fg: "#ffffff", accent: "#ffffff", font: "Archivo", titleSize: 0.12, title: { x: 0.09, y: 0.1 }, author: { x: 0.09, y: 0.88 } } },
  { id: "split", label: "Split", design: { bg: "#c8462c", fg: "#1c1a17", accent: "#f4efe6", font: "EB Garamond", titleSize: 0.11, title: { x: 0.08, y: 0.64 }, author: { x: 0.08, y: 0.9 } } },
];

export function defaultDesign(): CoverDesign {
  return {
    template: "bold",
    bg: "#ad3a17",
    fg: "#ffffff",
    accent: "#f2c14e",
    font: "Archivo",
    titleSize: 0.14,
    imageUrl: "",
    title: { x: 0.09, y: 0.1 },
    author: { x: 0.09, y: 0.88 },
    backBg: "",
    showBlurb: true,
    backImageUrl: "",
    spineBg: "",
    frontText: true,
  };
}

export function useImage(url: string): HTMLImageElement | null {
  const [loaded, setLoaded] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  useEffect(() => {
    if (!url) return;
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => setLoaded({ url, img: i });
    i.src = url;
  }, [url]);
  return url && loaded?.url === url ? loaded.img : null;
}

/** Cover an area with an image, cropping like object-fit: cover. */
function CoverImage({ img, x, y, w, h, opacity = 1 }: { img: HTMLImageElement; x: number; y: number; w: number; h: number; opacity?: number }) {
  const scale = Math.max(w / img.width, h / img.height);
  const cw = w / scale;
  const ch = h / scale;
  return <KImage image={img} x={x} y={y} width={w} height={h} opacity={opacity} crop={{ x: (img.width - cw) / 2, y: (img.height - ch) / 2, width: cw, height: ch }} />;
}

interface FrontProps {
  book: Pick<Book, "title" | "subtitle"> & { authorName: string };
  d: CoverDesign;
  x: number;
  y: number;
  w: number;
  h: number;
  img: HTMLImageElement | null;
  editable: boolean;
  onMove?: (key: "title" | "author", pos: { x: number; y: number }) => void;
}

function Front({ book, d, x, y, w, h, img, editable, onMove }: FrontProps) {
  const center = d.template === "framed";
  const tw = w * (center ? 0.74 : 0.84);
  const titleFont = d.titleSize * w;
  const drag = (key: "title" | "author") =>
    editable
      ? {
          draggable: true,
          onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
            const node = e.target;
            const ax = center ? node.x() + tw / 2 : node.x();
            onMove?.(key, { x: (ax - x) / w, y: (node.y() - y) / h });
          },
          onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => {
            const c = e.target.getStage()?.container();
            if (c) c.style.cursor = "move";
          },
          onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
            const c = e.target.getStage()?.container();
            if (c) c.style.cursor = "default";
          },
        }
      : {};
  const tx = (p: { x: number }) => (center ? x + p.x * w - tw / 2 : x + p.x * w);
  return (
    <Group>
      <Rect x={x} y={y} width={w} height={h} fill={d.bg} />
      {d.template === "art" &&
        (img ? (
          <CoverImage img={img} x={x} y={y} w={w} h={h} />
        ) : (
          <Text text={"Add your front artwork"} x={x} y={y + h * 0.47} width={w} align="center" fontFamily="Inter" fontSize={w * 0.05} fill={d.fg} opacity={0.6} />
        ))}
      {d.template === "photo" && img && <CoverImage img={img} x={x} y={y} w={w} h={h} />}
      {d.template === "photo" && <Rect x={x} y={y + h * 0.58} width={w} height={h * 0.42} fill="#000" opacity={0.55} />}
      {d.template === "split" && (img ? <CoverImage img={img} x={x} y={y} w={w} h={h * 0.58} /> : <Rect x={x} y={y} width={w} height={h * 0.58} fill={d.bg} />)}
      {d.template === "split" && <Rect x={x} y={y + h * 0.58} width={w} height={h * 0.42} fill={d.accent} />}
      {d.template === "bold" && img && <CoverImage img={img} x={x} y={y + h * 0.45} w={w} h={h * 0.4} />}
      {d.template === "framed" && <Rect x={x + w * 0.06} y={y + h * 0.04} width={w * 0.88} height={h * 0.92} stroke={d.accent} strokeWidth={w * 0.008} />}
      {d.template === "framed" && <Rect x={x + w * 0.42} y={y + h * 0.66} width={w * 0.16} height={w * 0.006} fill={d.accent} />}
      {d.frontText !== false && (
        <>
          <Group {...drag("title")} x={tx(d.title)} y={y + d.title.y * h}>
            <Text
              text={book.title}
              width={tw}
              fontFamily={d.font}
              fontStyle={d.font === "Archivo" || d.font === "Inter" ? "800" : "700"}
              fontSize={titleFont}
              lineHeight={0.98}
              letterSpacing={-titleFont * 0.02}
              fill={d.template === "split" ? d.fg : d.fg}
              align={center ? "center" : "left"}
            />
            {book.subtitle && (
              <Text
                text={book.subtitle}
                y={titleFont * Math.max(1, Math.ceil((book.title.length * titleFont * 0.52) / tw)) * 1.02 + titleFont * 0.35}
                width={tw}
                fontFamily={d.font}
                fontSize={w * 0.042}
                lineHeight={1.25}
                fill={d.template === "framed" ? d.accent : d.fg}
                opacity={0.92}
                align={center ? "center" : "left"}
              />
            )}
          </Group>
          <Text
            {...drag("author")}
            text={book.authorName.toUpperCase()}
            x={tx(d.author)}
            y={y + d.author.y * h}
            width={tw}
            fontFamily={d.font}
            fontStyle="700"
            fontSize={w * 0.045}
            letterSpacing={w * 0.004}
            fill={d.template === "framed" ? d.accent : d.fg}
            align={center ? "center" : "left"}
          />
        </>
      )}
    </Group>
  );
}

export interface DesignerProps {
  mode: "ebook" | "print";
  book: Pick<Book, "title" | "subtitle" | "description" | "imprint"> & { authorName: string };
  design: CoverDesign;
  geometry: CoverGeometry;
  zoom: number;
  guides: boolean;
  onMove?: FrontProps["onMove"];
}

/** Ebook: a 1600 x 2560 front (6.25 x 10 units). Print: the full wrap with spine. */
export const CoverStage = forwardRef<Konva.Stage, DesignerProps>(function CoverStage({ mode, book, design, geometry: g, zoom, guides, onMove }, ref) {
  const img = useImage(design.imageUrl);
  const backImg = useImage(mode === "print" ? design.backImageUrl : "");
  if (mode === "ebook") {
    const w = 6.25 * U;
    const h = 10 * U;
    return (
      <Stage ref={ref} width={w * zoom} height={h * zoom} scaleX={zoom} scaleY={zoom}>
        <Layer>
          <Front book={book} d={design} x={0} y={0} w={w} h={h} img={img} editable onMove={onMove} />
        </Layer>
      </Stage>
    );
  }
  const W = g.width * U;
  const H = g.height * U;
  const fx = g.frontX * U;
  const sx = g.spineX * U;
  const sw = g.spine * U;
  const pw = g.trim.width * U;
  const bleed = 0.125 * U;
  const backBg = design.backBg || design.bg;
  const textColor = design.template === "split" ? design.accent : design.fg;
  const blurb = book.description || "Your book description appears here. Add it on the Book details tab.";
  return (
    <Stage ref={ref} width={W * zoom} height={H * zoom} scaleX={zoom} scaleY={zoom}>
      <Layer>
        <Rect x={0} y={0} width={W} height={H} fill={backBg} />
        {backImg && <CoverImage img={backImg} x={0} y={0} w={sx} h={H} />}
        {/* front panel runs into the bleed on the right, top and bottom */}
        <Front book={book} d={design} x={fx} y={0} w={pw + bleed} h={H} img={img} editable onMove={onMove} />
        <Rect x={sx} y={0} width={sw} height={H} fill={design.spineBg || (design.template === "split" ? design.accent : design.bg)} />
        {g.spineTextAllowed && (
          <Group x={sx + sw / 2} y={H / 2} rotation={90}>
            <Text
              text={`${book.title}     ${book.authorName}`}
              x={-H * 0.42}
              y={-sw * 0.32}
              width={H * 0.84}
              height={sw * 0.64}
              align="center"
              verticalAlign="middle"
              fontFamily={design.font}
              fontStyle="700"
              fontSize={Math.min(sw * 0.5, 0.22 * U)}
              fill={design.template === "split" ? design.fg : design.fg}
            />
          </Group>
        )}
        {design.showBlurb && backImg && <BlurbPanel text={blurb} x={bleed + 0.55 * U} y={bleed + 0.8 * U} width={pw - 1.1 * U} font={design.font} fill={backBg} />}
        {design.showBlurb && <Text text={blurb} x={bleed + 0.55 * U} y={bleed + 0.8 * U} width={pw - 1.1 * U} fontFamily={design.font} fontSize={0.15 * U} lineHeight={1.45} fill={textColor} />}
        {book.imprint && <Text text={book.imprint} x={bleed + 0.55 * U} y={H - bleed - 0.75 * U} fontFamily={design.font} fontSize={0.12 * U} fill={textColor} opacity={0.85} />}
      </Layer>
      {guides && (
        <Layer listening={false}>
          {/* trim line */}
          <Rect x={bleed} y={bleed} width={W - 2 * bleed} height={H - 2 * bleed} stroke="#ff2d55" strokeWidth={1.2 / zoom} dash={[6 / zoom, 4 / zoom]} />
          {/* safe area: keep text 0.125 in inside the trim */}
          <Rect x={bleed + 0.125 * U} y={bleed + 0.125 * U} width={pw - 0.25 * U} height={H - 2 * bleed - 0.25 * U} stroke="#00a2ff" strokeWidth={1 / zoom} dash={[3 / zoom, 3 / zoom]} />
          <Rect x={fx + 0.125 * U} y={bleed + 0.125 * U} width={pw - 0.25 * U} height={H - 2 * bleed - 0.25 * U} stroke="#00a2ff" strokeWidth={1 / zoom} dash={[3 / zoom, 3 / zoom]} />
          <Line points={[sx, 0, sx, H]} stroke="#ff2d55" strokeWidth={1 / zoom} />
          <Line points={[fx, 0, fx, H]} stroke="#ff2d55" strokeWidth={1 / zoom} />
          <Rect x={g.barcode.x * U} y={g.barcode.y * U} width={g.barcode.width * U} height={g.barcode.height * U} fill="#ffffff" stroke="#ff2d55" strokeWidth={1 / zoom} />
          <Text x={g.barcode.x * U} y={g.barcode.y * U + g.barcode.height * U * 0.4} width={g.barcode.width * U} align="center" text="KDP barcode area" fontSize={0.12 * U} fill="#ff2d55" />
        </Layer>
      )}
    </Stage>
  );
});

/** A panel in the back cover colour behind the description, so it reads over artwork. */
function BlurbPanel({ text, x, y, width, font, fill }: { text: string; x: number; y: number; width: number; font: string; fill: string }) {
  const height = new Konva.Text({ text, width, fontFamily: font, fontSize: 0.15 * U, lineHeight: 1.45 }).height();
  const pad = 0.2 * U;
  return <Rect x={x - pad} y={y - pad} width={width + 2 * pad} height={height + 2 * pad} fill={fill} opacity={0.88} />;
}
