import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'

function Toast({ msg, type, onDone }) {
  return <div className={`toast ${type}`} onClick={onDone} style={{ cursor: 'pointer' }}>{msg}</div>
}

export default function AdminComisioane() {
  const { db, saveCommissionRule, deleteCommissionRule, toggleCommissionRule, createAgent, updateAgent, deleteAgent } = useStore()
  const [form, setForm] = useState({ agent_id: '', product_id: '', customer_id: '', rate: 1.5, priority: 10, notes: '' })
  const [editId, setEditId] = useState(null)
  const [toast, setToast] = useState(null)
  const [filterAgent, setFilterAgent] = useState('')
  // Agent CRUD
  const [showAgentForm, setShowAgentForm] = useState(false)
  const [agentForm, setAgentForm] = useState({ name: '', email: '', phone: '' })
  const [editAgentId, setEditAgentId] = useState(null)

  const agents = db.agents || []
  const products = (db.products || []).filter(p => p.activ).slice(0, 100)
  const firms = (db.firms || []).filter(f => f.status === 'activ')
  const rules = (db.commission_rules || []).filter(r => !filterAgent || r.agent_id === filterAgent)

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 2500) }

  // ── Agent CRUD ──
  async function handleSaveAgent() {
    if (!agentForm.name.trim()) return showToast('Completează numele agentului', 'error')
    try {
      if (editAgentId) {
        await updateAgent(editAgentId, agentForm)
      } else {
        await createAgent({ ...agentForm, default_rate: 1.5 })
      }
      setShowAgentForm(false)
      setAgentForm({ name: '', email: '', phone: '' })
      setEditAgentId(null)
      showToast(editAgentId ? 'Agent actualizat!' : 'Agent adăugat!')
    } catch (err) {
      showToast(err.message || 'Eroare la salvare', 'error')
    }
  }

  async function handleToggleAgent(agentId) {
    const agent = agents.find(a => a.id === agentId)
    if (!agent) return
    try {
      await updateAgent(agentId, { ...agent, is_active: !agent.is_active })
      showToast('Status agent actualizat!')
    } catch (err) { showToast(err.message, 'error') }
  }

  async function handleDeleteAgent(agentId) {
    const hasClients = firms.some(f => f.agent_id === agentId)
    if (hasClients) return showToast('Nu poți șterge un agent cu clienți asignați!', 'error')
    try {
      await deleteAgent(agentId)
      showToast('Agent șters!', 'error')
    } catch (err) { showToast(err.message, 'error') }
  }

  function handleEditAgent(agent) {
    setAgentForm({ name: agent.name, email: agent.email || '', phone: agent.phone || '' })
    setEditAgentId(agent.id)
    setShowAgentForm(true)
  }

  // ── Commission rule CRUD ──
  async function handleSave() {
    if (!form.agent_id) return showToast('Selectează agentul', 'error')
    if (form.rate < 0 || form.rate > 10) return showToast('Rata trebuie 0–10%', 'error')
    try {
      await saveCommissionRule({ id: editId || undefined, ...form, is_active: true })
      setForm({ agent_id: '', product_id: '', customer_id: '', rate: 1.5, priority: 10, notes: '' })
      setEditId(null)
      showToast('Regulă salvată!')
    } catch (err) {
      showToast(err.message || 'Eroare la salvare', 'error')
    }
  }

  function handleEdit(rule) {
    setForm({ agent_id: rule.agent_id, product_id: rule.product_id || '', customer_id: rule.customer_id || '', rate: rule.rate, priority: rule.priority, notes: rule.notes || '' })
    setEditId(rule.id)
  }

  function getRuleType(rule) {
    if (rule.product_id && rule.customer_id) return { label: 'Produs + Client', color: 'var(--purple-bg)', text: 'var(--purple-text)' }
    if (rule.customer_id) return { label: 'Per Client', color: 'var(--orange-bg)', text: 'var(--orange-text)' }
    if (rule.product_id) return { label: 'Per Produs', color: 'var(--blue-bg)', text: 'var(--blue-text)' }
    return { label: 'Default Agent', color: 'var(--green-bg)', text: 'var(--green-text)' }
  }

  function calcPretDemo(agentId, productId, customerId, basePrice = 10) {
    const agentRules = (db.commission_rules || []).filter(r => r.is_active && r.agent_id === agentId)
    const sorted = [...agentRules].sort((a, b) => b.priority - a.priority)
    let match = sorted.find(r => r.product_id === productId && r.customer_id === customerId)
      || sorted.find(r => !r.product_id && r.customer_id === customerId)
      || sorted.find(r => r.product_id === productId && !r.customer_id)
      || sorted.find(r => !r.product_id && !r.customer_id)
    const rate = match?.rate || 0
    return { rate, pret: Math.round(basePrice * (1 + rate / 100) * 100) / 100 }
  }

  return (
    <Layout title="Agenți & Comisioane" subtitle="Gestionare agenți de vânzări și marje de comision">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* ── SECȚIUNEA AGENȚI ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <div>
            <div className="section-title">Agenți de vânzări</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              {agents.filter(a => a.is_active).length} activi · {agents.filter(a => !a.is_active).length} inactivi
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowAgentForm(true); setEditAgentId(null); setAgentForm({ name: '', email: '', phone: '' }) }}>
            + Agent nou
          </button>
        </div>

        {/* Form agent */}
        {showAgentForm && (
          <div style={{ background: 'var(--blue-bg)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>{editAgentId ? 'Editare agent' : 'Agent nou'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Nume complet *</label>
                <input className="w-full" value={agentForm.name} onChange={e => setAgentForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Alin Balan" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Email</label>
                <input type="email" className="w-full" value={agentForm.email} onChange={e => setAgentForm(p => ({ ...p, email: e.target.value }))} placeholder="agent@gixen.ro" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Telefon</label>
                <input className="w-full" value={agentForm.phone} onChange={e => setAgentForm(p => ({ ...p, phone: e.target.value }))} placeholder="0700 000 000" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowAgentForm(false); setEditAgentId(null) }}>Anulează</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveAgent}>
                {editAgentId ? 'Salvează modificările' : 'Adaugă agent'}
              </button>
            </div>
          </div>
        )}

        {/* Lista agenți */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {agents.map(agent => {
            const nrClienti = firms.filter(f => f.agent_id === agent.id).length
            const nrComenzi = (db.orders || []).filter(o => o.agent_id === agent.id).length
            const defaultRule = (db.commission_rules || []).find(r => r.agent_id === agent.id && !r.product_id && !r.customer_id && r.is_active)

            return (
              <div key={agent.id} style={{ background: agent.is_active ? 'var(--white)' : 'var(--bg3)', border: `1px solid ${agent.is_active ? 'var(--border)' : 'var(--border2)'}`, borderRadius: 10, padding: '14px 16px', opacity: agent.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{agent.email}</div>
                    {agent.phone && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{agent.phone}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: agent.is_active ? 'var(--blue)' : 'var(--text3)' }}>
                      {defaultRule ? `+${defaultRule.rate}%` : '—'}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>marja default</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                  <span>👥 {nrClienti} clienți</span>
                  <span>📦 {nrComenzi} comenzi</span>
                  <span style={{ color: agent.is_active ? 'var(--green-text)' : 'var(--text3)', fontWeight: 600 }}>
                    {agent.is_active ? '● Activ' : '○ Inactiv'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEditAgent(agent)} style={{ flex: 1, justifyContent: 'center' }}>✏ Editează</button>
                  <button className={`btn btn-sm ${agent.is_active ? 'btn-secondary' : 'btn-success'}`} onClick={() => handleToggleAgent(agent.id)}>
                    {agent.is_active ? '⏸' : '▶'}
                  </button>
                  {nrClienti === 0 && (
                    <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`Ștergi agentul ${agent.name}?`)) handleDeleteAgent(agent.id) }}>🗑</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── SECȚIUNEA COMISIOANE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
        {/* Lista reguli */}
        <div>
          <div className="card" style={{ marginBottom: 12, padding: '10px 16px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Reguli de comision</div>
              <select style={{ marginLeft: 'auto' }} value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
                <option value="">Toți agenții</option>
                {agents.filter(a => a.is_active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {agents.filter(a => a.is_active && (!filterAgent || a.id === filterAgent)).map(agent => {
            const agentRules = rules.filter(r => r.agent_id === agent.id).sort((a, b) => b.priority - a.priority)
            return (
              <div key={agent.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{agent.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{agent.email}</div>
                  </div>
                  {(() => {
                    const def = agentRules.find(r => !r.product_id && !r.customer_id && r.is_active)
                    return def
                      ? <div style={{ textAlign: 'right' }}><span style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>+{def.rate}%</span><div style={{ fontSize: 10, color: 'var(--text3)' }}>default</div></div>
                      : <span style={{ fontSize: 12, color: 'var(--text3)' }}>Fără marja default</span>
                  })()}
                </div>

                {agentRules.length === 0 && (
                  <div style={{ color: 'var(--text3)', fontSize: 13 }}>Nicio regulă definită.</div>
                )}

                {agentRules.map(rule => {
                  const type = getRuleType(rule)
                  return (
                    <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', marginBottom: 6, opacity: rule.is_active ? 1 : 0.5 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 10, background: type.color, color: type.text, fontWeight: 700 }}>{type.label}</span>
                          <span style={{ fontSize: 10, color: 'var(--text3)' }}>P{rule.priority}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {rule.product_id && <span>📦 {(db.products || []).find(p => p.id === rule.product_id)?.name?.slice(0, 40) || rule.product_id}</span>}
                          {rule.customer_id && <span>🏢 {(db.firms || []).find(f => f.id === rule.customer_id)?.name?.slice(0, 30) || rule.customer_id}</span>}
                          {rule.notes && <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>{rule.notes}</span>}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: rule.is_active ? 'var(--blue)' : 'var(--text3)', minWidth: 48, textAlign: 'right' }}>+{rule.rate}%</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(rule)}>✏</button>
                        <button className={`btn btn-sm ${rule.is_active ? 'btn-secondary' : 'btn-success'}`} onClick={() => { toggleCommissionRule(rule.id); showToast(rule.is_active ? 'Dezactivat' : 'Activat') }}>
                          {rule.is_active ? '⏸' : '▶'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => { deleteCommissionRule(rule.id); showToast('Șters', 'error') }}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Form regulă + preview */}
        <div style={{ position: 'sticky', top: 16 }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="section-title" style={{ marginBottom: 14 }}>{editId ? 'Editare regulă' : 'Adaugă regulă nouă'}</div>

            <div className="form-group">
              <label>Agent *</label>
              <select className="w-full" value={form.agent_id} onChange={e => setForm(p => ({ ...p, agent_id: e.target.value }))}>
                <option value="">Selectează agent...</option>
                {agents.filter(a => a.is_active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Produs (opțional — lasă gol pentru toate)</label>
              <select className="w-full" value={form.product_id} onChange={e => setForm(p => ({ ...p, product_id: e.target.value }))}>
                <option value="">Toate produsele</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name.slice(0, 60)}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Client (opțional — lasă gol pentru toți)</label>
              <select className="w-full" value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                <option value="">Toți clienții agentului</option>
                {firms.filter(f => !form.agent_id || f.agent_id === form.agent_id).slice(0, 100).map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Marja % *</label>
                <input type="number" step={0.1} min={0} max={10} className="w-full" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} />
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Interval: 0.5 – 3.0%</div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Prioritate</label>
                <input type="number" min={1} max={99} className="w-full" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) || 10 }))} />
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Mai mare = câștigă</div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 10 }}>
              <label>Notă internă</label>
              <input className="w-full" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ex: Excepție Patrice XXL — Papirus" />
            </div>

            <div style={{ background: 'var(--blue-bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--blue-text)' }}>
              <strong>Priorități recomandate:</strong> Default=10 · Per produs=20 · Per client=30 · Produs+Client=40
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {editId && (
                <button className="btn btn-secondary" onClick={() => { setEditId(null); setForm({ agent_id: '', product_id: '', customer_id: '', rate: 1.5, priority: 10, notes: '' }) }}>
                  Anulează
                </button>
              )}
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSave}>
                {editId ? 'Salvează' : 'Adaugă regulă'}
              </button>
            </div>
          </div>

          {/* Preview calcul */}
          {form.agent_id && (
            <div className="card">
              <div className="section-title" style={{ marginBottom: 10 }}>Preview calcul preț</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Baza exemplu: 10.00 RON/rolă</div>
              {(() => {
                const rate = parseFloat(form.rate) || 0
                const calc = { rate, pret: Math.round(10 * (1 + rate / 100) * 100) / 100 }
                return (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text3)' }}>Preț de bază</span>
                      <span>10.00 RON</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text3)' }}>Marja agent (+{calc.rate}%)</span>
                      <span style={{ color: 'var(--green-text)' }}>+{(calc.pret - 10).toFixed(2)} RON</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                      <span>Preț client</span>
                      <span style={{ color: 'var(--blue)' }}>{calc.pret.toFixed(2)} RON</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
