import Link from "next/link";

const links = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Artist Submissions", href: "#" },
  { label: "Contact", href: "#" },
];

export function ShopFooter() {
  return (
    <footer className="mt-auto w-full bg-[#f4f4f0] dark:bg-stone-900">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between px-6 py-12 font-[family-name:var(--font-shop-body)] leading-relaxed md:flex-row md:px-12">
        <div className="mb-8 md:mb-0">
          <div className="text-lg font-bold text-[#56642b] dark:text-[#8a9a5b]">
            The Digital Curator
          </div>
          <p className="mt-2 max-w-xs text-sm text-[#5c605c]">
            Transforming culinary spaces through curated visual excellence.
          </p>
        </div>
        <div className="mb-8 flex flex-wrap justify-center gap-6 md:mb-0 md:gap-10">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-[#5c605c] transition-colors hover:text-[#934b28]"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="text-center text-sm text-[#5c605c] md:text-right">
          © 2024 The Digital Curator Gallery. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
