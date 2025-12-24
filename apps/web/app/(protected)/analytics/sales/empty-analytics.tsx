import { Button } from "@workspace/ui/components/button";

interface EmptyAnalyticsProps {
  title: string;
  description: string;
  ctaLabel: string;
  onUpload?: () => void;
}

export function EmptyAnalytics({
  title,
  description,
  ctaLabel,
  onUpload,
}: EmptyAnalyticsProps) {
  return (
    <div className="border rounded-md p-8 text-center space-y-4">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      <Button onClick={onUpload}>{ctaLabel}</Button>
    </div>
  );
}
