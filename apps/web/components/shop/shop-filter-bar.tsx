const filters = [
  "All Collections",
  "Posters",
  "Menu Backgrounds",
  "Custom Prints",
  "Limited Edition",
];

const sortOptions = [
  "Newest",
  "Price: Low to High",
  "Price: High to Low",
  "Popularity",
];

export function ShopFilterBar() {
  return (
    <section className="mb-16 flex flex-col items-end justify-between gap-8 md:flex-row">
      <div className="flex flex-wrap gap-4">
        {filters.map((label, i) => (
          <button
            key={label}
            type="button"
            className={
              i === 0
                ? "rounded-full bg-[#56642b] px-8 py-3 text-sm font-medium text-[#efffbc] shadow-sm transition-all"
                : "rounded-full bg-[#f4f4f0] px-8 py-3 text-sm font-medium text-[#5c605c] transition-all hover:bg-[#e6e9e4]"
            }
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative inline-block w-full text-left md:w-auto">
        <div className="flex items-center gap-2 rounded-full bg-[#f4f4f0] px-6 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#5c605c]">
            Sort By:
          </span>
          <select
            className="cursor-pointer border-none bg-transparent py-0 pr-8 text-sm font-semibold focus:ring-0"
            aria-label="Sort products"
            defaultValue={sortOptions[0]}
          >
            {sortOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
