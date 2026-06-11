// Capacități vehicule — câți paleți încap fizic în fiecare tip de transport.
// AICI se modifică valorile când se confirmă capacitățile reale.
export const CAPACITATE_DUBA_PALETI   = 8   // paleți de tip PALET_DUBA per dubă
export const CAPACITATE_CAMION_PALETI = 33  // paleți de tip PALET_CAMION per camion

// Auto-detectare tip transport pe baza coșului.
// Rămâne 'Van' (dubă) cât timp totalul comenzii încape în dubă —
// adică numărul echivalent de paleți de dubă <= CAPACITATE_DUBA_PALETI.
// Trecem pe 'Truck' doar când comanda depășește capacitatea dubei
// sau clientul a selectat explicit unități PALET_CAMION.
export function detectTransportType(liniiCos) {
  if (!liniiCos.length) return 'Van'

  // Selecție explicită de palet camion → camion
  if (liniiCos.some(l => l.unitateSel === 'PALET_CAMION')) return 'Truck'

  // Paleți de dubă echivalenți, per produs (coeficienții diferă între produse)
  let paletiDuba = 0
  for (const l of liniiCos) {
    const uomDuba = (l.produs?.product_uom || []).find(u => u.uom_code === 'PALET_DUBA')
    const coef = uomDuba?.coeficient || 0
    if (coef > 0) paletiDuba += (l.cantRole || 0) / coef
  }

  return paletiDuba > CAPACITATE_DUBA_PALETI ? 'Truck' : 'Van'
}
