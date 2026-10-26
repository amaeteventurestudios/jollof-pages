"use client";

/**
 * The 3D shelf on /books. Adapted from Mint Playground's Complete Shelf
 * (github.com/mintdotgg/mint-playground, experiences/complete-shelf), MIT licence, see LICENSE.
 * Jollof Pages changes: books come from PocketBase, covers are glossy paperbacks in a white room,
 * the detail panel links to the book's own page and first store, and the page scrolls past the shelf.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Newsreader } from "next/font/google";
import type { CatalogBook } from "./catalog";
import { ShelfEngine, type ShelfMode } from "./ShelfEngine";
import { shelfConfig } from "./config";
import "./shelf.css";

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] });

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <span aria-hidden="true" className={`arrow-icon arrow-icon--${direction}`}>
      <span />
    </span>
  );
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function CompleteShelf({ books }: { books: CatalogBook[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ShelfEngine | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<ShelfMode>("browse");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState("Setting out the books");

  const activeBook = books[activeIndex];
  const selectedBook = useMemo(() => (selectedIndex === null ? null : books[selectedIndex]), [selectedIndex, books]);
  const isFocused = mode !== "browse";

  useEffect(() => {
    let cancelled = false;
    let engine: ShelfEngine | null = null;

    async function start() {
      if (!canvasRef.current) return;
      if (!webglAvailable()) {
        setFailed(true);
        return;
      }
      await document.fonts.ready;
      if (cancelled || !canvasRef.current) return;
      try {
        engine = new ShelfEngine(canvasRef.current, books, {
          onActiveIndex: setActiveIndex,
          onMode: (nextMode, index) => {
            setMode(nextMode);
            setSelectedIndex(index);
          },
          onStatus: setStatus,
          onReady: () => setReady(true),
        });
        engineRef.current = engine;
      } catch {
        setFailed(true);
      }
    }

    void start();
    return () => {
      cancelled = true;
      engine?.dispose();
      engineRef.current = null;
    };
  }, [books]);

  if (failed || !activeBook) return null;

  return (
    <div className={`cs-root ${newsreader.variable}`}>
      <section
        className={`press-experience ${ready ? "is-ready" : ""} ${isFocused ? "is-focused" : "is-browsing"}`}
        aria-label="The shelf"
      >
        <canvas
          ref={canvasRef}
          className="shelf-canvas"
          role="application"
          tabIndex={0}
          aria-label={`Interactive three-dimensional shelf of ${books.length} books. Drag or use the arrow keys to browse. Press Enter to look at the selected book.`}
        />

        <header className="cs-header">
          <div className="wordmark" aria-label={`${shelfConfig.wordmark}, ${shelfConfig.collectionName}`}>
            <span>{shelfConfig.wordmark}</span>
            <span className="wordmark__divider" />
            <span>{shelfConfig.collectionName}</span>
          </div>
          <div className="header-actions">
            <div className="edition-mark">
              <span>
                {books.length} {books.length === 1 ? "BOOK" : "BOOKS"}
              </span>
              <span>PAPERBACK AND EBOOK</span>
            </div>
          </div>
        </header>

        <section className="browse-caption" aria-hidden={isFocused}>
          <p className="eyebrow">
            <span>{String(activeIndex + 1).padStart(2, "0")}</span>
            <span className="eyebrow__line" />
            <span>{String(books.length).padStart(2, "0")}</span>
          </p>
          <h2>{activeBook.shortTitle}</h2>
          <p className="browse-caption__author">{activeBook.author}</p>
          <button type="button" className="inspect-button" disabled={isFocused} onClick={() => engineRef.current?.focusBook(activeIndex)} aria-label={`Look at ${activeBook.title}`}>
            <span>Pick it up</span>
            <span aria-hidden="true">↗</span>
          </button>
        </section>

        <button type="button" className="shelf-arrow shelf-arrow--left" aria-label="Previous book" disabled={isFocused || activeIndex === 0} onClick={() => engineRef.current?.browseBy(-1)}>
          <ArrowIcon direction="left" />
        </button>
        <button type="button" className="shelf-arrow shelf-arrow--right" aria-label="Next book" disabled={isFocused || activeIndex === books.length - 1} onClick={() => engineRef.current?.browseBy(1)}>
          <ArrowIcon direction="right" />
        </button>

        <nav className="shelf-index" aria-label="Shelf position">
          <div className="shelf-index__ticks">
            {books.map((book, index) => (
              <button
                key={book.id}
                type="button"
                className={index === activeIndex ? "is-active" : ""}
                aria-label={`Browse to ${book.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
                disabled={isFocused}
                onClick={() => engineRef.current?.browseTo(index)}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="input-hint" aria-hidden="true">
            <span>DRAG</span>
            <i />
            <span>SCROLL</span>
            <i />
            <span>ARROW KEYS</span>
          </div>
        </nav>

        <aside className="book-details" aria-hidden={!isFocused} aria-label={selectedBook ? `About ${selectedBook.title}` : "About the book"}>
          {selectedBook ? (
            <div className="book-details__inner">
              <button type="button" className="back-button" onClick={() => engineRef.current?.returnToShelf()}>
                <ArrowIcon direction="left" />
                <span>Back to the shelf</span>
              </button>

              <div className="book-details__position">
                <span>{String(selectedIndex! + 1).padStart(2, "0")}</span>
                <span>{String(books.length).padStart(2, "0")}</span>
              </div>

              <div className="book-details__copy">
                <p className="eyebrow">{shelfConfig.editionEyebrow}</p>
                <h2>{selectedBook.title}</h2>
                <p className="book-details__author">{selectedBook.author}</p>
                {selectedBook.description && <p className="book-details__description">{selectedBook.description}</p>}

                {selectedBook.quote && (
                  <blockquote>
                    <p>&ldquo;{selectedBook.quote}&rdquo;</p>
                    <cite>{selectedBook.quoteBy}</cite>
                  </blockquote>
                )}

                <dl>
                  <div>
                    <dt>Format</dt>
                    <dd>{selectedBook.format}</dd>
                  </div>
                  <div>
                    <dt>Availability</dt>
                    <dd>{selectedBook.availability}</dd>
                  </div>
                </dl>

                <Link className="official-link" href={selectedBook.url}>
                  <span>{selectedBook.linkLabel ?? shelfConfig.bookLinkLabel}</span>
                  <span aria-hidden="true">→</span>
                </Link>
                {selectedBook.buyUrl && (
                  <a className="official-link" href={selectedBook.buyUrl} target="_blank" rel="noreferrer">
                    <span>{selectedBook.buyLabel}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>

              <div className="focus-controls" aria-label="Viewing controls">
                <span>Drag to turn it</span>
                <span>Pinch or scroll to zoom</span>
                <button type="button" onClick={() => engineRef.current?.resetFocusView()}>
                  Reset view
                </button>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="experience-status" role="status" aria-live="polite">
          <span className="experience-status__dot" />
          <span>{status}</span>
        </div>

        <div className="loading-screen" aria-hidden={ready}>
          <div className="loading-screen__mark">
            <span />
            <span />
            <span />
          </div>
          <p>Setting out {books.length} books</p>
        </div>

        <div className="sr-only" aria-live="polite">
          {isFocused && selectedBook ? `Looking at ${selectedBook.title} by ${selectedBook.author}.` : `Selected ${activeBook.title} by ${activeBook.author}.`}
        </div>
      </section>
    </div>
  );
}
