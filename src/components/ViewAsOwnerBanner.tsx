type ViewAsOwnerBannerProps = {
  facilityName: string
  onBack: () => void
  onSettings: () => void
}

export function ViewAsOwnerBanner({ facilityName, onBack, onSettings }: ViewAsOwnerBannerProps) {
  return (
    <div className="view-as-owner-banner" role="status" aria-live="polite">
      <p className="view-as-owner-banner-copy">
        Viewing as owner · {facilityName}
      </p>
      <p className="view-as-owner-banner-note">
        Operator session. This is not the floor PIN path and not the owner’s own magic-link.
      </p>
      <div className="view-as-owner-banner-actions">
        <button type="button" className="btn btn-ghost" onClick={onSettings}>
          Settings
        </button>
        <button type="button" className="btn btn-primary" onClick={onBack}>
          Back to admin
        </button>
      </div>
    </div>
  )
}
