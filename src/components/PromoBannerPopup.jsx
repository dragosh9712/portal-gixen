import { useState, useMemo } from 'react'

function isDismissedToday(bannerId) {
  const key = 'banner_dismissed_' + bannerId
  const val = localStorage.getItem(key)
  if (!val) return false
  return val === new Date().toISOString().slice(0, 10)
}

export default function PromoBannerPopup({ bannere, onClose }) {
  const visible = useMemo(() => bannere.filter(b => !isDismissedToday(b.id)), [bannere])
  const [idx, setIdx] = useState(0)

  if (!visible.length) return null

  const banner = visible[idx]

  function dismissToday() {
    localStorage.setItem('banner_dismissed_' + banner.id, new Date().toISOString().slice(0, 10))
    if (idx < visible.length - 1) setIdx(idx + 1)
    else onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h3 style={{ fontSize: 16 }}>{banner.title || 'Promoție'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {banner.image_url && (
          <div style={{ margin: '0 -20px', overflow: 'hidden', maxHeight: 280 }}>
            <img src={banner.image_url} alt={banner.title}
              style={{ width: '100%', objectFit: 'cover' }}
              onError={e => e.target.style.display = 'none'} />
          </div>
        )}

        {banner.description && (
          <div style={{ padding: '16px 0', fontSize: 14, color: 'var(--text1)', whiteSpace: 'pre-line' }}>
            {banner.description}
          </div>
        )}

        {visible.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '8px 0' }}>
            {visible.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: i === idx ? 'var(--blue)' : 'var(--border)' }} />
            ))}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={dismissToday}>Nu mai afișa azi</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {visible.length > 1 && idx > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setIdx(idx - 1)}>‹ Înapoi</button>
            )}
            {visible.length > 1 && idx < visible.length - 1 ? (
              <button className="btn btn-primary btn-sm" onClick={() => setIdx(idx + 1)}>Următor ›</button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={onClose}>Închide</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
