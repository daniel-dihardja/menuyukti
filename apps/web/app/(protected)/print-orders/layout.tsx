import { requireMenuyuktiAdmin } from '@/lib/menuyukti-role-server'

export default async function PrintOrdersLayout({ children }: { children: React.ReactNode }) {
  await requireMenuyuktiAdmin()
  return children
}
