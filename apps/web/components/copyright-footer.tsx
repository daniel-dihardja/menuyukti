export function CopyrightFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-card pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="shop-horizontal-padding-x mx-auto max-w-6xl text-center text-sm text-muted-foreground">
        © <span suppressHydrationWarning>{year}</span> Menuyukti
      </div>
    </footer>
  )
}
