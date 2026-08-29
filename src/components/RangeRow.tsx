import type { MinMax } from '../lib/targets'

type RangeRowProps = {
  label: string
  hint?: string
  value: MinMax
  onChange: (next: MinMax) => void
}

export function RangeRow({ label, hint, value, onChange }: RangeRowProps) {
  return (
    <div className="range-row">
      <div>
        <div className="field-label">{label}</div>
        {hint ? <div className="quiet">{hint}</div> : null}
      </div>
      <input
        inputMode="decimal"
        placeholder="min"
        value={value.min ?? ''}
        onChange={(e) => onChange({ ...value, min: e.target.value === '' ? null : Number(e.target.value) })}
      />
      <input
        inputMode="decimal"
        placeholder="max"
        value={value.max ?? ''}
        onChange={(e) => onChange({ ...value, max: e.target.value === '' ? null : Number(e.target.value) })}
      />
    </div>
  )
}
