/* 福州話 — the name of the language — standing in the empty space to the
   right of a page's headline at 5% ink, as a watermark. Dropped a little
   below the top so it sits beside the headline rather than above it; on a
   phone it shrinks and fades further so the headline stays the thing you
   read. The hero it sits in needs `relative isolate`, so the mark can sit
   behind the headline rather than over it. First on the home page, then
   on the four pages in the header's nav (Noah, 21 Sep 2026). */
export default function HeroMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      lang="zh-Hant"
      className={`han pointer-events-none absolute -z-10 -right-2 top-12 select-none whitespace-nowrap text-[clamp(72px,11vw,150px)] font-bold leading-none text-ink opacity-[.05] max-[760px]:top-2 max-[760px]:opacity-[.035] ${className}`}
    >
      福州話
    </span>
  );
}
