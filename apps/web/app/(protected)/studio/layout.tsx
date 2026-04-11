import { requireMenuyuktiAdmin } from '@/lib/menuyukti-role-server'

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireMenuyuktiAdmin()
  return children
}
