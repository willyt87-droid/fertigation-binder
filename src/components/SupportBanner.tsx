import { facilityStatusLabel } from '../lib/admin'
import type { SiteStatus } from '../types'

type SupportBannerProps = {
  facilityName: string
  status: SiteStatus
  onBack: () => void
  onSettings: () => void
}

export function SupportBanner({ facilityName, status, onBack, onSettings }: SupportBannerProps) {
  return (
    <div className="support-banner" role="status">
      <div>
        <p className="kicker">Support view</p>
        <p className="support-banner-title">Viewing as owner for {facilityName}</p>
        <p className="quiet">
          Not the floor cart · no PIN · not logging as a tech · {facilityStatusLabel(status)}
        </p>
      </div>
      <div className="support-banner-actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back to admin
        </button>
        <button type="button" className="btn btn-primary" onClick={onSettings}>
          Settings
        </button>
      </div>
    </div>
  )
}
