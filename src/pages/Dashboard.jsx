import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei, leiCuTva, cuTva, fmtDate, statusBadge } from '../utils'
import SurveyPopup from '../components/SurveyPopup'
import PromoBannerPopup from '../components/PromoBannerPopup'

export default function Dashboard() {
  const { user } = useAuth()
  const { db } = useStore()
  const navigate = useNavigate()
  const [showSurvey, setShowSurvey] = useState(false)
  const [showBanners, setShowBanners] = useState(false)

  useEffect(() => {
    if (user?.needsSurvey) { setShowSurvey(true); return }
    // Trigger "mereu până la completare": dacă există survey activ de acest tip
    // și firma nu a completat încă, popup la fiecare vizită pe dashboard
    if (user?.role !== 'admin') {
      const cid = user?.customerId || user?.firmId
      const myFirm = (db.firms || []).find(f => f.id === cid)
      const persistent = (db.surveys || []).some(s => s.is_active && s.trigger_on === 'until_completed')
      if (persistent && myFirm && !myFirm.survey_completed) setShowSurvey(true)
    }
  }, [user, db.surveys, db.firms])

  useEffect(() => {
    if (db.banners.length > 0 && user?.role !== 'admin') setShowBanners(true)
  }, [db.banners, user])

  const clientId = user.customerId || user.firmId || null
  const firma = (db.firms || []).find(f => f.id === clientId)
  const isEur = firma?.currency === 'EUR'
  const eurRate = parseFloat(db.exchange?.applied_rate || db.exchange?.rate || 0)
  const fmtVal = (val) => (isEur && eurRate > 0) ? `${((val || 0) / eurRate).toFixed(2)} EUR` : lei(val)
  const myOrders = db.orders.filter(o => o.firmId === clientId || o.customer_id === clientId)

  const kpi = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7)
    const luna = myOrders.filter(o => (o.dataComanda || o.created_at || '').startsWith(thisMonth))
    const active = myOrders.filter(o => ['plasata','in_aprobare','aprobata','in_procesare'].includes(o.status))
    // order.total = gross_total (deja CU TVA) — nu se mai aplică cuTva()
    const total = myOrders.reduce((s, o) => s + (o.total || 0), 0)
    const valLuna = luna.reduce((s, o) => s + (o.total || 0), 0)
    return { total: myOrders.length, active: active.length, valLuna, valTotal: total }
  }, [myOrders])

  // Bar chart: last 5 months
  const chartData = useMemo(() => {
    const months = []
    for (let i = 4; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('ro-RO', { month: 'short' })
      const val = myOrders
        .filter(o => (o.dataComanda || o.created_at || '').startsWith(key))
        .reduce((s, o) => s + (o.total || 0), 0)
      months.push({ label, val: Math.round(val) })
    }
    return months
  }, [myOrders])

  // Top products
  const topProducts = useMemo(() => {
    const map = {}
    myOrders.forEach(o => o.lines.forEach(l => {
      if (!map[l.productId]) map[l.productId] = 0
      map[l.productId] += l.cantitate
    }))
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([pid, qty]) => ({ product: db.products.find(p => p.id === pid), qty }))
      .filter(x => x.product)
  }, [myOrders, db.products])

  const recent = myOrders.slice(0, 5)

  return (
    <Layout title="Dashboard" actions={
      <button className="btn btn-primary btn-sm" onClick={() => navigate('/comanda-noua')}>
        + Comandă nouă
      </button>
    }>
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Comenzi totale</div>
          <div className="kpi-val">{kpi.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Valoare totală</div>
          <div className="kpi-val" style={{ fontSize: 18 }}>{fmtVal(kpi.valTotal)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">În curs</div>
          <div className="kpi-val">{kpi.active}</div>
          {kpi.active > 0 && <div className="kpi-sub warn">{kpi.active} active</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Luna aceasta</div>
          <div className="kpi-val" style={{ fontSize: 18 }}>{fmtVal(kpi.valLuna)}</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="dash-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>Valoare comenzi / lună</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v) => [lei(v), 'Valoare']}
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '0.5px solid #ddd' }}
              />
              <Bar dataKey="val" fill="#1a6bbf" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>Top produse</div>
          {topProducts.length === 0 ? (
            <div className="text-muted">Nicio comandă încă</div>
          ) : topProducts.map(({ product, qty }) => (
            <div key={product.id} className="flex-between" style={{ padding: '7px 0', borderBottom: '0.5px solid var(--border2)' }}>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{product.name.split(' ').slice(0, 3).join(' ')}</span>
              <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap', marginLeft: 8 }}>{qty} {product.unitate}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="section-hdr">
          <div className="section-title">Ultimele comenzi</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/comenzile-mele')}>
            Vezi toate →
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nr. comandă</th>
                <th>Dată</th>
                <th>Valoare</th>
                <th>Status</th>
                <th>Livrare</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={6} className="empty-state">Nicio comandă plasată</td></tr>
              ) : recent.map(order => (
                <tr key={order.id}>
                  <td><b>{order.nr}</b></td>
                  <td>{fmtDate(order.dataComanda)}</td>
                  <td>{leiCuTva(order.total)}</td>
                  <td>{statusBadge(order.status)}</td>
                  <td>{fmtDate(order.dataLivrare)}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate('/comanda-noua', { state: { reorder: order } })}
                    >
                      ↻ reorder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showSurvey && <SurveyPopup onDone={() => setShowSurvey(false)} />}
      {showBanners && <PromoBannerPopup bannere={db.banners} onClose={() => setShowBanners(false)} />}
    </Layout>
  )
}
