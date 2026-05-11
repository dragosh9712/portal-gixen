import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { lei, fmtDate, statusBadge } from '../utils'

const COLORS = ['#1a6bbf', '#27a355', '#e6931a', '#9b59b6', '#e74c3c']

export default function AdminDashboard() {
  const { db, updateOrderStatus } = useStore()
  const navigate = useNavigate()

  const orders = db.orders

  const kpi = useMemo(() => {
    const total = orders.length
    const valoare = orders.reduce((s, o) => s + o.total, 0)
    const inAprobare = orders.filter(o => o.status === 'in_aprobare').length
    const livrate = orders.filter(o => o.status === 'livrata').length
    return { total, valoare, inAprobare, livrate }
  }, [orders])

  // Monthly bar chart
  const chartData = useMemo(() => {
    const months = []
    for (let i = 4; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('ro-RO', { month: 'short' })
      const val = orders.filter(o => o.dataComanda?.startsWith(key)).reduce((s, o) => s + o.total, 0)
      months.push({ label, val: Math.round(val) })
    }
    return months
  }, [orders])

  // Status distribution
  const pieData = useMemo(() => {
    const map = {}
    orders.forEach(o => { map[o.status] = (map[o.status] || 0) + 1 })
    const labels = { plasata: 'Plasate', in_aprobare: 'Aprobare', aprobata: 'Aprobate', in_procesare: 'Procesare', livrata: 'Livrate', anulata: 'Anulate' }
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] || k, value: v }))
  }, [orders])

  // Pending approvals
  const pending = orders.filter(o => o.status === 'in_aprobare')

  return (
    <Layout title="Dashboard admin">
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total comenzi</div>
          <div className="kpi-val">{kpi.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Valoare totală</div>
          <div className="kpi-val" style={{ fontSize: 18 }}>{lei(kpi.valoare)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">În așteptare aprobare</div>
          <div className="kpi-val">{kpi.inAprobare}</div>
          {kpi.inAprobare > 0 && <div className="kpi-sub warn">⚠ necesită acțiune</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Livrate</div>
          <div className="kpi-val">{kpi.livrate}</div>
          <div className="kpi-sub">finalizate</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>Valoare comenzi / lună</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} barSize={32}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={v => [lei(v), 'Valoare']} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Bar dataKey="val" fill="#1a6bbf" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 8 }}>Distribuție statusuri</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16, border: '0.5px solid var(--orange-bg)' }}>
          <div className="section-hdr">
            <div className="section-title">⚠ Comenzi în așteptare aprobare ({pending.length})</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/comenzi')}>
              Vezi toate →
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nr.</th><th>Client</th><th>Valoare</th><th>Data</th><th></th></tr>
              </thead>
              <tbody>
                {pending.map(o => {
                  const firm = db.firms.find(f => f.id === o.firmId)
                  return (
                    <tr key={o.id}>
                      <td><b>{o.nr}</b></td>
                      <td>{firm?.name || '—'}</td>
                      <td><b>{lei(o.total)}</b></td>
                      <td>{fmtDate(o.dataComanda)}</td>
                      <td>
                        <div className="flex gap-8">
                          <button className="btn btn-success btn-sm" onClick={() => updateOrderStatus(o.id, 'aprobata')}>
                            ✓ Aprobă
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => updateOrderStatus(o.id, 'anulata')}>
                            ✗ Respinge
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="card">
        <div className="section-hdr">
          <div className="section-title">Ultimele comenzi</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/comenzi')}>
            Toate comenzile →
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Nr.</th><th>Client</th><th>Valoare</th><th>Status</th><th>Data</th></tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map(o => {
                const firm = db.firms.find(f => f.id === o.firmId)
                return (
                  <tr key={o.id}>
                    <td><b>{o.nr}</b></td>
                    <td>{firm?.name || '—'}</td>
                    <td>{lei(o.total)}</td>
                    <td>{statusBadge(o.status)}</td>
                    <td>{fmtDate(o.dataComanda)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
