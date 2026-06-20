import { AnalyticsProvider } from './analytics-provider'

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>
}
