"use client";

import { StudioNav } from "@/components/studio/studio-nav";
import { ImageLibrary } from "@/components/studio/image-library";

/** My images: every picture uploaded to any book, in one place. */
export default function ImagesPage() {
  return (
    <>
      <StudioNav />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] app:min-h-0 max-w-6xl flex-col px-4 py-8 sm:px-8 sm:py-10">
        <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.02em]">My images</h1>
        <p className="mt-1 max-w-2xl text-soft">
          Every image you have placed in a book, plus any you upload here. Use them as chapter images or in the text from the Write tab. Drag files onto this page to upload several at once.
        </p>
        <ImageLibrary className="mt-6 flex-1" />
      </main>
    </>
  );
}
