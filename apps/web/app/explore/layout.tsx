import { requireMenuyuktiAdmin } from '@/lib/menuyukti-role-server'

export default async function ExploreLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requireMenuyuktiAdmin()
  return children
}
