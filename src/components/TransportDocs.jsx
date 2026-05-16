// TransportDocs — bloc transport + documente vizibil pentru client (read-only)
import { fmtDate } from '../utils'

function DocButton({ label, url, icon }) {
  if (!url) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px dashed var(--border)', opacity: 0.5 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label} — indisponibil</span>
    </div>
  )
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--blue-bg)', borderRadius: 8, border: '1px solid rgba(37,99,235,0.2)', cursor: 'pointer', transition: 'all 0.15s' }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 12, color: 'var(--blue-text)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--blue)', marginLeft: 'auto' }}>↓ Descarcă</span>
      </div>
    </a>
  )
}

export default function TransportDocs({ order, isAdmin = false }) {
  const t = order.transport || {}
  const d = order.documente || {}
  const hasTransport = t.sofer || t.nrMasina || t.dataLivrareConfirmata

  if (!hasTransport && !d.nrAviz && !d.nrFactura && !isAdmin) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
      {/* Transport */}
      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          🚚 Detalii transport
        </div>
        {hasTransport ? (
          <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
            {t.sofer && <div><span style={{ color: 'var(--text3)' }}>Șofer:</span> <b>{t.sofer}</b></div>}
            {t.nrMasina && <div><span style={{ color: 'var(--text3)' }}>Mașină:</span> <b>{t.nrMasina}</b></div>}
            {t.dataLivrareConfirmata && (
              <div><span style={{ color: 'var(--text3)' }}>Data livrare:</span> <b style={{ color: 'var(--green-text)' }}>{fmtDate(t.dataLivrareConfirmata)}</b></div>
            )}
            {t.oraEstimata && <div><span style={{ color: 'var(--text3)' }}>Oră estimată:</span> <b>{t.oraEstimata}</b></div>}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
            {order.status === 'livrata' || order.status === 'in_livrare' || order.status === 'aviz_generat'
              ? 'Date transport în curs de actualizare'
              : 'Disponibil după aprobarea comenzii'
            }
          </div>
        )}
      </div>

      {/* Documente */}
      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          📄 Documente
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <DocButton
            label={d.nrAviz ? `Aviz ${d.nrAviz}` : 'Aviz însoțire marfă'}
            url={d.urlAviz} icon="📋"
          />
          <DocButton
            label={d.nrFactura ? `Factură ${d.nrFactura}` : 'Factură fiscală'}
            url={d.urlFactura} icon="🧾"
          />
        </div>
      </div>
    </div>
  )
}

// TransportDocsAdmin — versiunea admin cu editare
export function TransportDocsAdmin({ order, onUpdateTransport, onUpdateDocumente }) {
  const t = order.transport || {}
  const d = order.documente || {}

  function Field({ label, value, field, section, type = 'text', placeholder }) {
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11 }}>{label}</label>
        <input type={type} className="w-full" placeholder={placeholder} defaultValue={value || ''}
          onBlur={e => {
            const val = e.target.value.trim()
            if (val !== (value || '')) {
              if (section === 'transport') onUpdateTransport({ [field]: val || null })
              else onUpdateDocumente({ [field]: val || null })
            }
          }}
          style={{ fontSize: 12, padding: '6px 10px' }}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Transport edit */}
      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🚚 Transport (WMS → manual până la integrare)
        </div>
        <Field label="Nume șofer" value={t.sofer} field="sofer" section="transport" placeholder="ex: Ionescu Alexandru" />
        <Field label="Nr. mașină" value={t.nrMasina} field="nrMasina" section="transport" placeholder="ex: B 247 GXN" />
        <Field label="Dată livrare confirmată" value={t.dataLivrareConfirmata} field="dataLivrareConfirmata" section="transport" type="date" />
        <Field label="Oră estimată livrare" value={t.oraEstimata} field="oraEstimata" section="transport" placeholder="ex: 10:00–12:00" />
      </div>

      {/* Documente edit */}
      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📄 Documente (WMS → manual până la integrare)
        </div>
        <Field label="Nr. aviz însoțire marfă" value={d.nrAviz} field="nrAviz" section="docs" placeholder="ex: AV-2025-0891" />
        <Field label="URL PDF aviz (encodat)" value={d.urlAviz} field="urlAviz" section="docs" placeholder="https://..." />
        <Field label="Nr. factură fiscală" value={d.nrFactura} field="nrFactura" section="docs" placeholder="ex: FX-1234" />
        <Field label="URL PDF factură (encodat)" value={d.urlFactura} field="urlFactura" section="docs" placeholder="https://..." />
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, lineHeight: 1.6 }}>
          💡 URL-urile vor veni automat din WMS SelectSoft după integrare.<br/>
          Până atunci, completează manual după ce primești datele din ERP.
        </div>
      </div>
    </div>
  )
}
