import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-md text-muted-foreground text-sm">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Button asChild type="button" variant="outline">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  )
}
