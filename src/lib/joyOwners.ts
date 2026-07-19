import type { Category, JoyOwner } from '../types/budget'

export const DEFAULT_JOY_OWNER: JoyOwner = 'joshua'

export type JoyOwnerLabels = Record<JoyOwner, string>

export const DEFAULT_JOY_OWNER_LABELS: JoyOwnerLabels = {
  joshua: 'You',
  sav: 'Partner',
}

export const JOY_OWNER_KEYS: JoyOwner[] = ['joshua', 'sav']

export function getJoyOwnerOptions(labels: JoyOwnerLabels) {
  return JOY_OWNER_KEYS.map(key => ({ key, label: labels[key] }))
}

export function getJoyOwnerLabel(owner: JoyOwner, labels: JoyOwnerLabels): string {
  return labels[owner]
}

export function getJoyOwnerForTransaction(transaction: {
  category: Category
  joyOwner?: JoyOwner
}): JoyOwner | undefined {
  if (transaction.category !== 'joy') return undefined
  return transaction.joyOwner ?? DEFAULT_JOY_OWNER
}
