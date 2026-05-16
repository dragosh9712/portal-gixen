import { useMemo } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useStore } from '../StoreContext'
import { lei, fmtDate } from '../utils'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0891b2']

function KPI({ label, value, sub, color, icon }) {
  return (
    <div className="kpi-card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="kpi-label">{label}</div>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div className="kpi-val">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export default function ClientRapoarte() {
  const { user } = useAuth()
  const { db } = useStore()
  const navigate = useNavigate()
  const firmId = user.firmId

  const myOrders = db.orders.filter(o => o.firmId === firmId)

  const stats = useMemo(() => {
    const livrate = myOrders.filter(o => o.status === 'livrata')
    const active = myOrders.filter(o => ['plasata', 'in_aprobare', 'aprobata', 'in_procesare'].includes(o.status))
    const valTotala = myOrders.reduce((s, o) => s + o.total, 0)
    const valLivrate = livrate.reduce((s, o) => s + o.total, 0)
    const valMedie = myOrders.length ? valTotala / myOrders.length : 0

    // Evolutie lunara - 6 luni
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('ro-RO', { month: 'short' })
      const mo = myOrders.filter(o => o.dataComanda?.startsWith(key))
      months.push({ label, val: Math.round(mo.reduce((s, o) => s + o.total, 0)), comenzi: mo.length })
    }

    // Top produse comandate
    const prodMap = {}
    myOrders.filter(o => o.status !== 'anulata').forEach(o => {
      o.lines.forEach(l => {
        if (!prodMap[l.productId]) prodMap[l.productId] = { qty: 0, val: 0 }
        prodMap[l.productId].qty += l.cantitate
        prodMap[l.productId].val += l.total
      })
    })
    const topProduse = Object.entries(prodMap)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 5)
      .map(([pid, d]) => ({ product: db.products.find(p => p.id === pid), ...d }))
      .filter(x => x.product)

    // Status breakdown
    const statusMap = {}
    myOrders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1 })
    const statusLabels = { plasata: 'Plasate', in_aprobare: 'Aprobare', aprobata: 'Aprobate', in_procesare: 'Procesare', livrata: 'Livrate', anulata: 'Anulate' }
    const pieData = Object.entries(statusMap).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }))

    // Ultima comanda pentru reorder
    const ultimaComanda = myOrders.find(o => o.status === 'livrata')

    return { livrate, active, valTotala, valLivrate, valMedie, months, topProduse, pieData, ultimaComanda }
  }, [myOrders, db])

  return (
    <Layout title="Rapoartele mele" subtitle="Activitatea contului tău">

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <KPI label="Total comenzi" value={myOrders.length} sub={`${stats.livrate.length} livrate`} color="#2563eb" icon="📦" />
        <KPI label="Valoare totală" value={lei(stats.valTotala)} sub="toate comenzile" color="#16a34a" icon="💰" />
        <KPI label="Valoare medie" value={lei(stats.valMedie)} sub="per comandă" color="#9333ea" icon="📊" />
        <KPI label="Comenzi active" value={stats.active.length} sub={stats.active.length > 0 ? 'în procesare' : 'nicio comandă activă'} color={stats.active.length > 0 ? '#ea580c' : '#94a3b8'} icon="⚡" />
      </div>

      {/* Evolutie + Statusuri */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>Valoare comenzi — ultimele 6 luni</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats.months}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={v => [lei(v), 'Valoare']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="val" stroke="#2563eb" strokeWidth={2} fill="url(#grad1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 8 }}>Comenzi pe status</div>
          {stats.pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}>
                    {stats.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', justifyContent: 'center' }}>
                {stats.pieData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text2)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: 24 }}>Nicio comandă</div>
          )}
        </div>
      </div>

      {/* Top produse */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>Produsele mele favorite</div>
          {stats.topProduse.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>Nicio comandă plasată</div>
          ) : stats.topProduse.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--blue-bg)', color: 'var(--blue-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {i + 1}
              </div>
              {p.product.imagine && (
                <img src={p.product.imagine} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }}
                  onError={e => e.target.style.display = 'none'} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.qty.toLocaleString()} {p.product.unitate} comandate</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{lei(p.val)}</div>
            </div>
          ))}
        </div>

        {/* Nr comenzi pe luna */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>Număr comenzi / lună</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.months} barSize={20}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={v => [v, 'Comenzi']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="comenzi" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reorder rapid */}
      {stats.ultimaComanda && (
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--blue-bg) 0%, #fff 100%)', border: '1px solid rgba(37,99,235,0.15)' }}>
          <div className="flex-between">
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Comandă rapidă</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                Reia comanda <b>{stats.ultimaComanda.nr}</b> din {fmtDate(stats.ultimaComanda.dataComanda)} —{' '}
                {stats.ultimaComanda.lines.length} produs(e), {lei(stats.ultimaComanda.total)}
              </div>
            </div>
            <button className="btn btn-primary"
              onClick={() => navigate('/comanda-noua', { state: { reorder: stats.ultimaComanda } })}>
              ↻ Reorder
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
