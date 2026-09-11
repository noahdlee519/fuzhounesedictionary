/* The search pill in the header, on every page. A plain GET form to "/", so
   it works before any JavaScript loads and lands on the same results page
   as the big box on the home page. */
export default function HeaderSearch({
  className = "",
  placeholder = "Search for anything",
  label = "Search the dictionary",
}: {
  className?: string;
  placeholder?: string;
  label?: string;
}) {
  return (
    <form action="/" method="get" role="search" className={`relative ${className}`}>
      <label htmlFor="header-q" className="sr-only">
        {label}
      </label>
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-[13px] w-[13px] -translate-y-1/2 opacity-45"
      >
        <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        id="header-q"
        type="search"
        name="q"
        autoComplete="off"
        placeholder={placeholder}
        aria-label={label}
        className="h-[34px] w-full rounded-full border border-transparent bg-surface pl-8 pr-3.5 text-sm tracking-[-.01em] text-ink outline-none transition-colors placeholder:text-inkMute focus:border-ruleStrong focus:bg-paper focus-visible:outline-none"
      />
    </form>
  );
}
