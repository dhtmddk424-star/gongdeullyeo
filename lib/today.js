export function getToday() {
  const now = new Date()
  const adjusted = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return `${adjusted.getFullYear()}-${String(adjusted.getMonth() + 1).padStart(2, '0')}-${String(adjusted.getDate()).padStart(2, '0')}`
}
