import type { BandTone } from '../types'

type ToneValueProps = {
  label: string
  value: string
  tone?: BandTone
}

export function ToneValue({ label, value, tone = 'none' }: ToneValueProps) {
  return (
    <div className="metric">
      <span className="label">{label}</span>
      <span className={`val tone-${tone}`}>{value}</span>
    </div>
  )
}
