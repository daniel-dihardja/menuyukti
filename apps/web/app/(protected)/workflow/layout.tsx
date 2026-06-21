import { AnalyticsProvider } from '../analytics/analytics-provider'

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>
}
