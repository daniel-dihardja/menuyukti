import { requireMenuyuktiAdmin } from '@/lib/menuyukti-role-server'

export default async function OrderMetricsLayout({ children }: { children: React.ReactNode }) {
  await requireMenuyuktiAdmin()
  return children
}
