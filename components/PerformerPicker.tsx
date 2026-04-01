"use client";

export type PerformerOption = {
  id: string;
  display_name: string | null;
};

type Props = {
  performers: PerformerOption[];
  onRemove: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResults: PerformerOption[];
  searching: boolean;
  onSelect: (p: PerformerOption) => void;
};

export function PerformerPicker({
  performers,
  onRemove,
  searchQuery,
  onSearchChange,
  searchResults,
  searching,
  onSelect,
}: Props) {
  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-normal text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";

  return (
    <div className="sm:col-span-2">
      <p className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        Co-performers{" "}
        <span className="font-normal normal-case tracking-normal text-zinc-600">
          (optional — search other magicians on Magicalive)
        </span>
      </p>

      {performers.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {performers.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ml-gold)]/40 bg-[var(--ml-gold)]/10 px-3 py-1 text-xs font-medium text-[var(--ml-gold)]"
            >
              {p.display_name ?? "Magician"}
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="ml-0.5 text-[var(--ml-gold)]/60 hover:text-[var(--ml-gold)]"
                aria-label={`Remove ${p.display_name ?? "performer"}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="search"
          className={inputClass}
          placeholder="Search by name…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
        />
        {(searching || searchResults.length > 0) && searchQuery.trim().length >= 2 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-xl">
            {searching && (
              <li className="px-4 py-2 text-xs text-zinc-500">Searching…</li>
            )}
            {!searching && searchResults.length === 0 && (
              <li className="px-4 py-2 text-xs text-zinc-500">No magicians found</li>
            )}
            {searchResults.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-zinc-100 transition hover:bg-white/10"
                  onClick={() => {
                    onSelect(r);
                    onSearchChange("");
                  }}
                >
                  {r.display_name ?? "Unnamed magician"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
