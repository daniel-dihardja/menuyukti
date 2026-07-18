import { AnalyticsProvider } from '../analytics/analytics-provider'

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>
}
