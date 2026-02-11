type PageHeadingProps = {
  title: string;
  description?: string;
};

export function PageHeading({ title, description }: PageHeadingProps) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}
