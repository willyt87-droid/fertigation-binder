export const OWNER_SETUP_STEPS = ['Email', 'Facility', 'Rooms', 'Targets'] as const

export function ownerSetupKicker(step: 1 | 2 | 3 | 4) {
  return `Owner setup · ${step} / 4 · ${OWNER_SETUP_STEPS[step - 1]}`
}

export function remainingSetupSteps(step: 1 | 2 | 3 | 4) {
  const rest = OWNER_SETUP_STEPS.slice(step)
  if (rest.length === 0) return 'Last step.'
  if (rest.length === 1) return `Next: ${rest[0].toLowerCase()}.`
  const lead = rest.slice(0, -1).map((name) => name.toLowerCase()).join(', ')
  return `Next: ${lead}, then ${rest[rest.length - 1].toLowerCase()}.`
}

export const PENDING_FLOOR_NOTE =
  'New facilities stay pending until the operator approves floor unlock, so you may not log today.'
