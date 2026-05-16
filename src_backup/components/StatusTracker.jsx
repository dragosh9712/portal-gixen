export default function StatusTracker({ status }) {
  const steps = [
    { key: 'plasata',      label: 'Plasată',      icon: '📋' },
    { key: 'in_aprobare',  label: 'Aprobare',     icon: '⏳' },
    { key: 'aprobata',     label: 'Aprobată',     icon: '✅' },
    { key: 'in_procesare', label: 'Pick depozit', icon: '📦' },
    { key: 'aviz_generat', label: 'Aviz emis',    icon: '📄' },
    { key: 'in_livrare',   label: 'În livrare',   icon: '🚚' },
    { key: 'livrata',      label: 'Livrată',      icon: '🎉' },
  ]
  if (status === 'anulata') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
        <div className="status-step-circle cancelled">✗</div>
        <div style={{ fontSize: 13, color: 'var(--red-text)', fontWeight: 500 }}>Comandă anulată</div>
      </div>
    )
  }
  const currentIdx = steps.findIndex(s => s.key === status)
  return (
    <div className="status-tracker">
      {steps.map((step, i) => {
        const isDone = i < currentIdx
        const isActive = i === currentIdx
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div className="status-step">
              <div className={`status-step-circle ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                {isDone ? '✓' : step.icon}
              </div>
              <div className={`status-step-label ${isDone ? 'done' : isActive ? 'active' : ''}`}>{step.label}</div>
            </div>
            {i < steps.length - 1 && <div className={`status-line ${isDone ? 'done' : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}
