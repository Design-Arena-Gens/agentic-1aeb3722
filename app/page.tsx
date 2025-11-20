import dynamic from "next/dynamic";

const ThumbnailDesigner = dynamic(() => import("../components/ThumbnailDesigner"), {
  ssr: false
});

export default function Page() {
  return (
    <main className="mx-auto flex max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12 lg:pb-24">
      <header className="space-y-6 text-center lg:text-left">
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-brand-secondary/40 bg-brand-secondary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-brand-secondary">
          YouTube Creative Lab
        </span>
        <h1 className="font-anton text-4xl uppercase tracking-tight text-white sm:text-5xl lg:text-6xl">
          Design Magnetic Thumbnails
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
          Craft scroll-stopping visuals with a canvas tuned for the 1280×720 sweet spot. Layer punchy
          typography, expressive imagery, and hyper-contrast backgrounds while referencing proven
          engagement heuristics. Export production-ready PNGs in seconds.
        </p>
      </header>
      <ThumbnailDesigner />
    </main>
  );
}
