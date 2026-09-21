'use client'

import { PwaInstallGuide } from '@/components/pwa/pwa-install-guide'

/** @deprecated Prefer {@link PwaInstallGuide}; kept as a thin alias for the dashboard page. */
export function DashboardPwaGuide() {
  return <PwaInstallGuide headingId="dashboard-pwa-heading" />
}
