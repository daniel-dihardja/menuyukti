import { requireMenuyuktiAdmin } from '@/lib/menuyukti-role-server'

export default async function PostsLayout({ children }: { children: React.ReactNode }) {
  await requireMenuyuktiAdmin()
  return children
}
