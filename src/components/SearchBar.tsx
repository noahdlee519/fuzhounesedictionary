export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form
      action="/"
      method="get"
      className="flex border-2 border-ruleStrong bg-surface focus-within:border-lacquer"
    >
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        autoFocus
        placeholder="Search — characters, romanization, English, or Chinese…"
        className="w-full bg-transparent px-5 py-4 text-lg outline-none placeholder:text-inkFaint"
      />
      <button
        type="submit"
        className="shrink-0 bg-lacquer px-7 font-display font-semibold uppercase tracking-wide text-paper transition-opacity hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}
