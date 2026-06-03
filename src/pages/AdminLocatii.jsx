import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'

function Toast({msg,type,onDone}) {
  return <div className={`toast ${type}`} onClick={onDone} style={{cursor:'pointer'}}>{msg}</div>
}

export default function AdminLocatii() {
  const { db, saveLocation, setDefaultLocation } = useStore()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name:'', cod_gestiune:'', tip_gestiune:'ridicata', address:'', selectsoft_cod:'', is_active:true })
  const [toast, setToast] = useState(null)

  const locations = db.locations || []

  function showToast(msg,type='success'){setToast({msg,type});setTimeout(()=>setToast(null),2500)}

  function handleSave() {
    if (!form.name || !form.cod_gestiune) return showToast('Completează câmpurile obligatorii','error')
    saveLocation({ id: editing || 'loc_'+Date.now(), ...form })
    setEditing(null)
    setForm({ name:'', cod_gestiune:'', tip_gestiune:'ridicata', address:'', selectsoft_cod:'', is_active:true })
    showToast('Locație salvată!')
  }

  function handleEdit(loc) {
    setEditing(loc.id)
    setForm({ name:loc.name, cod_gestiune:loc.cod_gestiune||'', tip_gestiune:loc.tip_gestiune||'ridicata', address:loc.address||'', selectsoft_cod:loc.selectsoft_cod||'', is_active:loc.is_active })
  }

  function handleSetDefault(id) {
    setDefaultLocation(id)
    showToast('Gestiune default actualizată!')
  }

  return (
    <Layout title="Locații & Gestiuni" subtitle="Gestionare gestiuni din SelectSoft">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:16,alignItems:'start'}}>
        {/* List */}
        <div className="card">
          <div className="flex-between" style={{marginBottom:14}}>
            <div className="section-title">Gestiuni configurate</div>
            <button className="btn btn-primary btn-sm" onClick={()=>{setEditing('new');setForm({name:'',cod_gestiune:'',tip_gestiune:'ridicata',address:'',selectsoft_cod:'',is_active:true})}}>+ Gestiune nouă</button>
          </div>

          {locations.map(loc => (
            <div key={loc.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--bg)',borderRadius:10,marginBottom:8,border:`1px solid ${loc.is_default_order?'var(--blue)':'var(--border)'}`}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                  <span style={{fontWeight:700,fontSize:14}}>{loc.name}</span>
                  {loc.is_default_order && <span style={{fontSize:10,padding:'1px 8px',borderRadius:10,background:'var(--blue)',color:'#fff',fontWeight:700}}>DEFAULT COMENZI</span>}
                </div>
                <div style={{fontSize:12,color:'var(--text3)',display:'flex',gap:10}}>
                  <span>Cod: <strong>{loc.cod_gestiune}</strong></span>
                  <span>Tip: {loc.tip_gestiune}</span>
                  {loc.selectsoft_cod && <span>SS: {loc.selectsoft_cod}</span>}
                </div>
                {loc.address && <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{loc.address}</div>}
              </div>
              <div style={{display:'flex',gap:6}}>
                {!loc.is_default_order && (
                  <button className="btn btn-secondary btn-sm" onClick={()=>handleSetDefault(loc.id)}>Set default</button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={()=>handleEdit(loc)}>✏</button>
                <span style={{padding:'4px 10px',borderRadius:10,fontSize:11,fontWeight:600,background:loc.is_active?'var(--green-bg)':'var(--bg3)',color:loc.is_active?'var(--green-text)':'var(--text3)'}}>
                  {loc.is_active?'Activ':'Inactiv'}
                </span>
              </div>
            </div>
          ))}

          {locations.length === 0 && <div style={{color:'var(--text3)',fontSize:13,textAlign:'center',padding:'24px 0'}}>Nicio gestiune configurată.</div>}
        </div>

        {/* Form */}
        {editing && (
          <div className="card" style={{position:'sticky',top:16}}>
            <div className="flex-between" style={{marginBottom:14}}>
              <div className="section-title">{editing==='new'?'Gestiune nouă':'Editare gestiune'}</div>
              <button style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text3)'}} onClick={()=>setEditing(null)}>×</button>
            </div>
            <div className="form-group">
              <label>Denumire *</label>
              <input className="w-full" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Ex: Gestiunea 8.1 — Depozit Principal" />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Cod gestiune SS *</label>
                <input className="w-full" value={form.cod_gestiune} onChange={e=>setForm(p=>({...p,cod_gestiune:e.target.value}))} placeholder="8.1" />
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Tip gestiune</label>
                <select className="w-full" value={form.tip_gestiune} onChange={e=>setForm(p=>({...p,tip_gestiune:e.target.value}))}>
                  <option value="ridicata">Ridicată (Depozit)</option>
                  <option value="amanunt">Amănunt (Magazin)</option>
                </select>
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Cod SS intern</label>
                <input className="w-full" value={form.selectsoft_cod} onChange={e=>setForm(p=>({...p,selectsoft_cod:e.target.value}))} placeholder="0008" />
              </div>
              <div className="form-group" style={{marginBottom:0,display:'flex',alignItems:'center',gap:8,paddingTop:20}}>
                <input type="checkbox" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))}/>
                <label style={{marginBottom:0}}>Activă</label>
              </div>
            </div>
            <div className="form-group" style={{marginTop:10}}>
              <label>Adresă</label>
              <input className="w-full" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="Str. Depozitului nr. 1, București"/>
            </div>
            <div style={{background:'var(--orange-bg)',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,color:'var(--orange-text)'}}>
              ⚠ Gestiunea default pentru comenzi se poate schimba cu butonul "Set default" din listă. Pot fi plasate comenzi doar din gestiunea marcată ca default.
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-secondary" onClick={()=>setEditing(null)}>Anulează</button>
              <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={handleSave}>Salvează</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
