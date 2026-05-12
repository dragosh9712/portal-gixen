import { lei } from '../utils'

export default function PriceTooltip({ pretBaza, pretTier, discTotal, discGlobal, pretFinal, unitate, promoLabel }) {
  const hasDiscount = pretFinal < pretBaza
  if (!hasDiscount) return <span style={{ fontWeight: 700 }}>{lei(pretFinal)}/{unitate}</span>

  return (
    <div className="tooltip-wrap">
      <span style={{ fontWeight: 700, color: 'var(--blue)', cursor: 'help', borderBottom: '1px dashed var(--blue)' }}>
        {lei(pretFinal)}/{unitate}
      </span>
      <div className="tooltip-box" style={{ minWidth: 180 }}>
        <div style={{ marginBottom: 6, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 4 }}>Breakdown preț</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
          <span style={{ opacity: 0.7 }}>Preț bază</span><span>{lei(pretBaza)}</span>
        </div>
        {pretTier < pretBaza && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
            <span style={{ opacity: 0.7 }}>Tier cantitate</span><span style={{ color: '#86efac' }}>→ {lei(pretTier)}</span>
          </div>
        )}
        {discTotal > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
            <span style={{ opacity: 0.7 }}>{promoLabel || 'Discount produs'}</span><span style={{ color: '#86efac' }}>-{discTotal}%</span>
          </div>
        )}
        {discGlobal > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
            <span style={{ opacity: 0.7 }}>Discount cont</span><span style={{ color: '#86efac' }}>-{discGlobal}%</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 4, marginTop: 4, fontWeight: 700 }}>
          <span>Final</span><span style={{ color: '#86efac' }}>{lei(pretFinal)}</span>
        </div>
      </div>
    </div>
  )
}
