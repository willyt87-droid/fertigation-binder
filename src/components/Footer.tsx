type FooterProps = {
  onOverview: () => void
  active?: boolean
}

export function Footer({ onOverview, active = true }: FooterProps) {
  return (
    <footer className="app-footer">
      <button type="button" className={`footer-tab${active ? ' active' : ''}`} onClick={onOverview}>
        Overview
      </button>
    </footer>
  )
}
