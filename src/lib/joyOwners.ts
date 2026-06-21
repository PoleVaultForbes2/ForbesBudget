import type { Category, JoyOwner } from '../types/budget'

export const DEFAULT_JOY_OWNER: JoyOwner = 'joshua'

export const JOY_OWNER_LABELS: Record<JoyOwner, string> = {
  joshua: 'Joshua',
  sav: 'Sav',
}

export const JOY_OWNER_OPTIONS: Array<{ key: JoyOwner; label: string }> = [
  { key: 'joshua', label: JOY_OWNER_LABELS.joshua },
  { key: 'sav', label: JOY_OWNER_LABELS.sav },
]

export function getJoyOwnerLabel(owner: JoyOwner): string {
  return JOY_OWNER_LABELS[owner]
}

export function getJoyOwnerForTransaction(transaction: {
  category: Category
  joyOwner?: JoyOwner
}): JoyOwner | undefined {
  if (transaction.category !== 'joy') return undefined
  return transaction.joyOwner ?? DEFAULT_JOY_OWNER
}
