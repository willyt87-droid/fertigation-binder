import { useEffect, type ReactNode } from 'react'

type SheetProps = {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Sheet({ title, onClose, children }: SheetProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-head">
          <div className="sheet-handle" />
          <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}
