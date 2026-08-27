export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/" method="get" className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        autoFocus
        placeholder="Search — characters, romanization, English, or Chinese…"
        className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-lg shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accentSoft dark:bg-stone-900 dark:border-stone-700"
      />
      <button type="submit" className="rounded-full bg-accent px-6 py-3 font-medium text-white hover:opacity-90">
        Search
      </button>
    </form>
  );
}
