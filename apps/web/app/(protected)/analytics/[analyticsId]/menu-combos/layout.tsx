import { requireMenuyuktiAdmin } from '@/lib/menuyukti-role-server'

export default async function MenuCombosLayout({ children }: { children: React.ReactNode }) {
  await requireMenuyuktiAdmin()
  return children
}
