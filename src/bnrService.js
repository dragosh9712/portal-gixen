export async function fetchBNRRate(_currency = 'EUR') {
  try {
    const res = await fetch('/api/exchange/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('gixen_token') || ''}`,
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch {
    return null
  }
}

export function applyMargin(rate, marginPct = 0) {
  if (!rate) return null
  return Math.round(rate * (1 + marginPct / 100) * 10000) / 10000
}
