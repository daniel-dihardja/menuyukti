export function CopyrightFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-card py-6">
      <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
        © {year} Menuyukti
      </div>
    </footer>
  );
}
