type LandingMenuMockProps = {
  ariaLabel: string
  eyebrow: string
  venueName: string
  tagline: string
  guestFavorite: string
  category: string
  dish1Name: string
  dish1Price: string
  dish1Desc: string
  dish2Name: string
  dish2Price: string
  dish2Desc: string
  dish3Name: string
  dish3Price: string
  dish3Desc: string
}

type DishRow = {
  name: string
  price: string
  desc: string
  favorite?: boolean
}

export function LandingMenuMock({
  ariaLabel,
  eyebrow,
  venueName,
  tagline,
  guestFavorite,
  category,
  dish1Name,
  dish1Price,
  dish1Desc,
  dish2Name,
  dish2Price,
  dish2Desc,
  dish3Name,
  dish3Price,
  dish3Desc,
}: LandingMenuMockProps) {
  const dishes: DishRow[] = [
    { name: dish1Name, price: dish1Price, desc: dish1Desc, favorite: true },
    { name: dish2Name, price: dish2Price, desc: dish2Desc },
    { name: dish3Name, price: dish3Price, desc: dish3Desc },
  ]

  return (
    <div
      className="landing-menu-mock relative mx-auto w-full max-w-[280px] sm:max-w-[300px]"
      role="img"
      aria-label={ariaLabel}
    >
      <div
        className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_center,rgba(82,56,30,0.12),transparent_70%)]"
        aria-hidden
      />
      <div
        className="relative overflow-hidden rounded-[1.75rem] border border-[rgba(82,56,30,0.14)] bg-[#efeae2] shadow-[0_24px_48px_-20px_rgba(82,56,30,0.35)]"
        aria-hidden
      >
        {/* Phone notch */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-16 rounded-full bg-[rgba(82,56,30,0.18)]" />
        </div>

        {/* Menu header band */}
        <div className="relative flex min-h-[7.5rem] flex-col justify-end overflow-hidden px-4 pb-4 pt-6">
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#3d2a1a] via-[#5c4030] to-[#8a6a4a]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent"
            aria-hidden
          />
          <div className="relative z-10">
            <p className="mb-1.5 text-[0.65rem] font-medium tracking-[0.2em] text-white/70 uppercase">
              {eyebrow}
            </p>
            <p className="text-xl font-semibold leading-tight tracking-tight text-white">
              {venueName}
            </p>
            <p className="mt-1.5 text-sm text-pretty text-white/85">{tagline}</p>
          </div>
        </div>

        {/* Menu body */}
        <div className="bg-[url('/images/public-menu-wallpaper.svg')] bg-repeat bg-[length:220px_220px] px-3 pt-4 pb-5">
          <p className="mb-2.5 text-[0.65rem] font-semibold tracking-wide text-[#3d2a1a]/uppercase">
            {category}
          </p>
          <ul className="flex flex-col gap-2">
            {dishes.map((dish) => (
              <li
                key={dish.name}
                className="rounded-xl border border-[rgba(82,56,30,0.1)] bg-[rgba(255,252,248,0.92)] p-3 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium tracking-tight text-[#1a1410]">
                    {dish.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-[#5c4a3a]">{dish.price}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-pretty text-[#6b5a4a]">
                  {dish.desc}
                </p>
                {dish.favorite ? (
                  <span className="mt-2 inline-flex rounded-md bg-[rgba(82,56,30,0.08)] px-1.5 py-0.5 text-[0.6rem] font-medium tracking-wide text-[#5c4030] uppercase">
                    {guestFavorite}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center bg-[#efeae2] pb-2.5 pt-1">
          <div className="h-1 w-24 rounded-full bg-[rgba(82,56,30,0.2)]" />
        </div>
      </div>
    </div>
  )
}
