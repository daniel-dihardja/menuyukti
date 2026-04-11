import { requireMenuyuktiAdmin } from '@/lib/menuyukti-role-server'

export default async function CustomToolsLayout({ children }: { children: React.ReactNode }) {
  await requireMenuyuktiAdmin()
  return children
}
