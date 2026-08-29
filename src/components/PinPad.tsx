type PinPadProps = {
  value: string
  onChange: (next: string) => void
  max?: number
}

export function PinPad({ value, onChange, max = 4 }: PinPadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  function press(key: string) {
    if (!key) return
    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }
    if (value.length >= max) return
    onChange(value + key)
  }

  return (
    <div>
      <div className="pin-dots" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`pin-dot${i < value.length ? ' filled' : ''}`} />
        ))}
      </div>
      <div className="pin-pad">
        {keys.map((key, i) =>
          key ? (
            <button key={key + i} type="button" className="pin-key" onClick={() => press(key)}>
              {key}
            </button>
          ) : (
            <span key={`blank-${i}`} />
          ),
        )}
      </div>
    </div>
  )
}
