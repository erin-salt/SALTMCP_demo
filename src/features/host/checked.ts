// How the host phrases the age of a SALT observation (`checked_at`).
export const checkedLabel = (checkedAt: string, now: number) => {
  const minutes = Math.floor((now - Date.parse(checkedAt)) / 60000)
  return minutes < 1 ? 'Checked just now' : `Checked ${minutes} min ago`
}
