import Link from "next/link";
import { ShoppingBag, User } from "lucide-react";

const nav = [
  { label: "Posters", href: "#", active: true },
  { label: "Menu Backgrounds", href: "#" },
  { label: "Custom Prints", href: "#" },
  { label: "Limited Edition", href: "#" },
];

export function ShopHeader() {
  return (
    <header className="shop-glass-nav sticky top-0 z-50 w-full">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-6 font-[family-name:var(--font-shop-headline)] tracking-tight md:px-12">
        <div className="text-2xl font-bold text-[#56642b] dark:text-[#8a9a5b]">
          The Digital Curator
        </div>
        <nav className="hidden gap-8 md:flex">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={
                item.active
                  ? "border-b-2 border-[#56642b] font-bold text-[#56642b] transition-colors duration-300 dark:text-[#8a9a5b]"
                  : "font-medium text-[#5c605c] transition-colors duration-300 hover:text-[#56642b] dark:text-stone-400"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-6">
          <button
            type="button"
            className="text-[#5c605c] transition-all hover:text-[#56642b]"
            aria-label="Shopping bag"
          >
            <ShoppingBag className="size-6" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="text-[#5c605c] transition-all hover:text-[#56642b]"
            aria-label="Account"
          >
            <User className="size-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
