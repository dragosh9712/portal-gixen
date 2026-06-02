import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { lei } from '../utils'

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#dc2626', '#0891b2']

function KPI({ label, value, sub, color, icon }) {
  return (
    <div className="kpi-card" style={{ borderTop: `3px solid ${color || 'var(--blue)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="kpi-label">{label}</div>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div className="kpi-val">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export default function AdminRapoarte() {
  const { db } = useStore()
  const [period, setPeriod] = useState('6')

  const orders = db.orders
  const firms = db.firms.filter(f => f.status === 'activ')

  const stats = useMemo(() => {
    const livrate = orders.filter(o => o.status === 'livrata')
    const valTotala = livrate.reduce((s, o) => s + o.total, 0)
    const valoareMedie = livrate.length ? valTotala / livrate.length : 0
    const inAprobare = orders.filter(o => o.status === 'in_aprobare').length
    const anulate = orders.filter(o => o.status === 'anulata').length
    const rataAnulare = orders.length ? (anulate / orders.length * 100).toFixed(1) : 0

    // Top produse
    const prodMap = {}
    orders.filter(o => o.status !== 'anulata').forEach(o => {
      o.lines.forEach(l => {
        if (!prodMap[l.productId]) prodMap[l.productId] = { qty: 0, val: 0 }
        prodMap[l.productId].qty += l.cantitate
        prodMap[l.productId].val += l.total
      })
    })
    const topProduse = Object.entries(prodMap)
      .sort((a, b) => b[1].val - a[1].val)
      .slice(0, 5)
      .map(([pid, d]) => ({ product: db.products.find(p => p.id === pid), ...d }))
      .filter(x => x.product)

    // Top clienti
    const clientMap = {}
    orders.filter(o => o.status !== 'anulata').forEach(o => {
      if (!clientMap[o.firmId]) clientMap[o.firmId] = { comenzi: 0, val: 0 }
      clientMap[o.firmId].comenzi++
      clientMap[o.firmId].val += o.total
    })
    const topClienti = Object.entries(clientMap)
      .sort((a, b) => b[1].val - a[1].val)
      .slice(0, 5)
      .map(([fid, d]) => ({ firm: db.firms.find(f => f.id === fid), ...d }))
      .filter(x => x.firm)

    // Evolutie lunara
    const months = []
    const n = parseInt(period)
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' })
      const monthOrders = orders.filter(o => o.dataComanda?.startsWith(key))
      const val = monthOrders.reduce((s, o) => s + o.total, 0)
      months.push({ label, val: Math.round(val), comenzi: monthOrders.length })
    }

    // Statusuri pie
    const statusMap = {}
    orders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1 })
    const statusLabels = { plasata: 'Plasate', in_aprobare: 'Aprobare', aprobata: 'Aprobate', in_procesare: 'Procesare', livrata: 'Livrate', anulata: 'Anulate' }
    const pieData = Object.entries(statusMap).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }))

    return { valTotala, valoareMedie, inAprobare, rataAnulare, topProduse, topClienti, months, pieData }
  }, [orders, db, period])

  return (
    <Layout title="Rapoarte & analiză" subtitle="Vizualizare performanță platformă">
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {[['3', '3 luni'], ['6', '6 luni'], ['12', '12 luni']].map(([v, l]) => (
          <button key={v} className={`btn btn-sm ${period === v ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod(v)}>{l}</button>
        ))}
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <KPI label="Valoare totală comenzi" value={lei(stats.valTotala)} sub="toate comenzile livrate" color="#2563eb" icon="💰" />
        <KPI label="Valoare medie comandă" value={lei(stats.valoareMedie)} sub="per comandă livrată" color="#16a34a" icon="📊" />
        <KPI label="Clienți activi" value={firms.length} sub="conturi aprobate" color="#9333ea" icon="🏢" />
        <KPI label="Rată anulare" value={`${stats.rataAnulare}%`} sub="din total comenzi" color={parseFloat(stats.rataAnulare) > 10 ? '#dc2626' : '#16a34a'} icon="❌" />
      </div>

      {/* Evolutie + Statusuri */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="section-hdr">
            <div className="section-title">Evoluție valoare comenzi</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.months}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={v => [lei(v), 'Valoare']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="val" stroke="#2563eb" strokeWidth={2} fill="url(#colorVal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>Distribuție statusuri</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                {stats.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', justifyContent: 'center' }}>
            {stats.pieData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nr comenzi pe luna */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>Număr comenzi / lună</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={stats.months} barSize={24}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={v => [v, 'Comenzi']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="comenzi" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top produse + Top clienti */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>Top 5 produse (valoare)</div>
          {stats.topProduse.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--blue-bg)', color: 'var(--blue-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {i + 1}
              </div>
              {p.product.imagine && (
                <img src={p.product.imagine} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }}
                  onError={e => e.target.style.display = 'none'} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.product.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.qty.toLocaleString()} {p.product.unitate}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{lei(p.val)}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>Top 5 clienți (valoare)</div>
          {stats.topClienti.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--purple-bg)', color: 'var(--purple-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.firm.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.comenzi} comenzi</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{lei(c.val)}</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
