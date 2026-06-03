import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { lei, fmtDate, statusBadge } from '../utils'

const TIPURI_REGULA = [
  { value: 'LINE_DISCOUNT',  label: 'Discount % pe linie produs' },
  { value: 'LINE_AMOUNT',    label: 'Discount valoric (RON) pe linie' },
  { value: 'MIX_MATCH',     label: 'Mix & Match' },
  { value: 'ORDER_VALUE',    label: 'Discount la valoare comandă (prag)' },
  { value: 'BUY_X_GET_Y',   label: 'Buy X Get Y (produs gratuit)' },
  { value: 'CAMPAIGN',       label: 'Campanie temporară' },
  { value: 'CATEGORY',       label: 'Discount pe categorie' },
  { value: 'BRAND',          label: 'Discount pe marcă' },
]
const TIPURI_CONDITIE = [
  { value: 'produs_in_cos',              label: 'Produs în coș cu cantitate minimă' },
  { value: 'cantitate_totala_categorie', label: 'Cantitate totală din categorie' },
  { value: 'valoare_cos',               label: 'Valoare coș minimă (RON)' },
  { value: 'grup_client',               label: 'Grup client' },
  { value: 'marca_in_cos',              label: 'Marcă în coș' },
  { value: 'cumul_comenzi_luna',        label: 'Număr comenzi în luna curentă' },
  { value: 'cumul_valoare_luna',        label: 'Valoare cumulată luna curentă' },
]
const TIPURI_ACTIUNE = [
  { value: 'discount_procent_linie',  label: 'Discount % pe produs specific' },
  { value: 'discount_valoric_linie',  label: 'Discount RON pe produs specific' },
  { value: 'discount_procent_total',  label: 'Discount % pe total comandă' },
  { value: 'discount_valoric_total',  label: 'Discount RON pe total comandă' },
  { value: 'produs_gratuit',          label: 'Produse gratuite' },
]
const BAZE_CALCUL = [
  { value: 'pret_baza',                   label: 'Preț de bază' },
  { value: 'pret_dupa_discount_anterior', label: 'Preț după discounturi anterioare' },
  { value: 'total_net',                   label: 'Total net coș' },
]
const LUNI = ['', 'Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function ConditionRow({ cond, idx, onChange, onRemove, products }) {
  return (
    <div style={{ background:'var(--white)', borderRadius:8, padding:12, marginBottom:8, border:'1px solid var(--border)' }}>
      <div style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
        {idx > 0 && (
          <select value={cond.operator||'AND'} onChange={e => onChange({...cond,operator:e.target.value})} style={{width:70,fontSize:12}}>
            <option value="AND">ȘI</option>
            <option value="OR">SAU</option>
          </select>
        )}
        <select value={cond.tip} onChange={e => onChange({...cond,tip:e.target.value,productId:'',grup:'',cantMin:0,valoareMin:0})} style={{flex:1,fontSize:12}}>
          {TIPURI_CONDITIE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={onRemove} className="btn btn-danger btn-sm">✕</button>
      </div>
      {cond.tip === 'produs_in_cos' && (
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:8}}>
          <div><label style={{fontSize:11}}>Produs</label>
            <select className="w-full" value={cond.productId||''} onChange={e=>onChange({...cond,productId:e.target.value})} style={{fontSize:12}}>
              <option value="">Selectează produs...</option>
              {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><label style={{fontSize:11}}>Cant. min (role)</label>
            <input type="number" min={0} className="w-full" value={cond.cantMin||0} onChange={e=>onChange({...cond,cantMin:parseInt(e.target.value)||0})} style={{fontSize:12,padding:'6px 8px'}}/></div>
        </div>
      )}
      {cond.tip === 'valoare_cos' && (
        <div><label style={{fontSize:11}}>Valoare minimă (RON)</label>
          <input type="number" min={0} className="w-full" value={cond.valoareMin||0} onChange={e=>onChange({...cond,valoareMin:parseFloat(e.target.value)||0})} style={{fontSize:12,padding:'6px 8px'}}/></div>
      )}
      {cond.tip === 'grup_client' && (
        <div><label style={{fontSize:11}}>Grup</label>
          <select className="w-full" value={cond.grup||''} onChange={e=>onChange({...cond,grup:e.target.value})} style={{fontSize:12}}>
            <option value="">Selectează...</option>
            <option value="standard">Standard</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select></div>
      )}
      {cond.tip === 'cumul_comenzi_luna' && (
        <div><label style={{fontSize:11}}>Nr. minim comenzi în luna curentă</label>
          <input type="number" min={1} className="w-full" value={cond.nr_comenzi_min||1} onChange={e=>onChange({...cond,nr_comenzi_min:parseInt(e.target.value)||1})} style={{fontSize:12,padding:'6px 8px'}}/></div>
      )}
      {cond.tip === 'cumul_valoare_luna' && (
        <div><label style={{fontSize:11}}>Valoare minimă cumulată luna curentă (RON)</label>
          <input type="number" min={0} className="w-full" value={cond.valoare_min||0} onChange={e=>onChange({...cond,valoare_min:parseFloat(e.target.value)||0})} style={{fontSize:12,padding:'6px 8px'}}/></div>
      )}
    </div>
  )
}

function Toast({msg,type,onDone}) {
  return <div className={`toast ${type}`} onClick={onDone} style={{cursor:'pointer'}}>{msg}</div>
}

export default function AdminPromotii() {
  const { db, addPromotionRule, updatePromotionRule, togglePromotionRule } = useStore()
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [toast, setToast] = useState(null)

  const defaultRule = {
    name:'', tip:'LINE_DISCOUNT', scope:'per_order', activ:true, prioritate:1,
    combinabil:true, bazaCalcul:'pret_baza', valid_month:'', valid_year:'',
    conditii:[{tip:'produs_in_cos',productId:'',cantMin:0}],
    actiune:{tip:'discount_procent_linie',productIdTinta:'',valoare:0,eticheta:'',cantitateGratuita:1},
    restrictii:{dataStart:'',dataEnd:''}
  }
  const [form, setForm] = useState(defaultRule)

  const rules = db.promotionRules || []
  const products = (db.products||[]).filter(p=>p.activ)

  function showToast(msg,type='success'){setToast({msg,type});setTimeout(()=>setToast(null),2500)}

  function openEdit(rule) {
    setSelected(rule); setIsNew(false)
    setForm({...defaultRule,...rule,conditii:rule.conditii?[...rule.conditii]:[{tip:'produs_in_cos',productId:'',cantMin:0}],actiune:{...defaultRule.actiune,...rule.actiune},restrictii:{...defaultRule.restrictii,...rule.restrictii}})
  }

  function openNew() {
    setSelected(null); setIsNew(true); setForm({...defaultRule,id:undefined})
  }

  function handleSave() {
    if (!form.name.trim()) return showToast('Completează numele regulii','error')
    if (isNew) addPromotionRule(form)
    else updatePromotionRule(selected.id, form)
    showToast('Regulă salvată!')
    setSelected(null); setIsNew(false)
  }

  function updateCond(idx, val) {
    const next = [...form.conditii]; next[idx] = val; setForm(p=>({...p,conditii:next}))
  }
  function removeCond(idx) {
    setForm(p=>({...p,conditii:p.conditii.filter((_,i)=>i!==idx)}))
  }
  function addCond() {
    setForm(p=>({...p,conditii:[...p.conditii,{tip:'produs_in_cos',productId:'',cantMin:0}]}))
  }

  return (
    <Layout title="Promoții & Reguli">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 480px',gap:16,alignItems:'start'}}>
        {/* Lista */}
        <div className="card">
          <div className="flex-between" style={{marginBottom:14}}>
            <div className="section-title">Reguli active ({rules.filter(r=>r.activ).length}/{rules.length})</div>
            <button className="btn btn-primary btn-sm" onClick={openNew}>+ Regulă nouă</button>
          </div>
          {rules.length === 0 && <div style={{color:'var(--text3)',fontSize:13,padding:'20px 0',textAlign:'center'}}>Nicio regulă definită.</div>}
          {rules.map(rule => (
            <div key={rule.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border2)'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:rule.activ?'var(--text)':'var(--text3)',marginBottom:2}}>{rule.name}</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <span style={{fontSize:10,padding:'1px 7px',borderRadius:10,background:'var(--bg3)',color:'var(--text2)',fontWeight:600}}>{rule.tip}</span>
                  <span style={{fontSize:10,padding:'1px 7px',borderRadius:10,background:rule.scope==='monthly_cumul'?'var(--purple-bg)':'var(--blue-bg)',color:rule.scope==='monthly_cumul'?'var(--purple-text)':'var(--blue-text)',fontWeight:600}}>
                    {rule.scope==='monthly_cumul'?'Cumul lunar':'Per comandă'}
                  </span>
                  {rule.combinabil && <span style={{fontSize:10,padding:'1px 7px',borderRadius:10,background:'var(--green-bg)',color:'var(--green-text)',fontWeight:600}}>Combinabil</span>}
                  {rule.valid_month && <span style={{fontSize:10,padding:'1px 7px',borderRadius:10,background:'var(--orange-bg)',color:'var(--orange-text)',fontWeight:600}}>{LUNI[rule.valid_month]}{rule.valid_year?' '+rule.valid_year:''}</span>}
                  <span style={{fontSize:10,color:'var(--text3)'}}>P{rule.prioritate}</span>
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(rule)}>Editează</button>
                <button className={`btn btn-sm ${rule.activ?'btn-danger':'btn-success'}`} onClick={()=>{togglePromotionRule(rule.id);showToast(rule.activ?'Dezactivată':'Activată',rule.activ?'error':'success')}}>
                  {rule.activ?'Dezactivează':'Activează'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Editor */}
        {(selected || isNew) && (
          <div className="card" style={{position:'sticky',top:16}}>
            <div className="flex-between" style={{marginBottom:16}}>
              <div className="section-title">{isNew?'Regulă nouă':'Editare: '+selected?.name}</div>
              <button style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text3)'}} onClick={()=>{setSelected(null);setIsNew(false)}}>×</button>
            </div>

            <div className="form-group">
              <label>Nume regulă *</label>
              <input className="w-full" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Ex: Gold -8% Patrice XXL" />
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Tip regulă</label>
                <select className="w-full" value={form.tip} onChange={e=>setForm(p=>({...p,tip:e.target.value}))}>
                  {TIPURI_REGULA.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Scope</label>
                <select className="w-full" value={form.scope} onChange={e=>setForm(p=>({...p,scope:e.target.value}))}>
                  <option value="per_order">Per comandă</option>
                  <option value="monthly_cumul">Cumul lunar</option>
                </select>
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Prioritate (1=cel mai mic)</label>
                <input type="number" min={1} max={99} className="w-full" value={form.prioritate} onChange={e=>setForm(p=>({...p,prioritate:parseInt(e.target.value)||1}))} />
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Bază calcul</label>
                <select className="w-full" value={form.bazaCalcul} onChange={e=>setForm(p=>({...p,bazaCalcul:e.target.value}))}>
                  {BAZE_CALCUL.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              {form.scope==='per_order' && (
                <>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label>Lună valabilă (0=oricând)</label>
                    <select className="w-full" value={form.valid_month||''} onChange={e=>setForm(p=>({...p,valid_month:e.target.value?parseInt(e.target.value):''}))}>
                      <option value="">Oricând</option>
                      {LUNI.slice(1).map((l,i)=><option key={i+1} value={i+1}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label>An (opțional)</label>
                    <input type="number" className="w-full" value={form.valid_year||''} onChange={e=>setForm(p=>({...p,valid_year:e.target.value?parseInt(e.target.value):''}))} placeholder="2026" />
                  </div>
                </>
              )}
            </div>

            <div style={{display:'flex',gap:16,marginTop:10,marginBottom:4}}>
              <label style={{display:'flex',gap:6,cursor:'pointer',fontSize:12}}>
                <input type="checkbox" checked={form.activ} onChange={e=>setForm(p=>({...p,activ:e.target.checked}))}/>Activă
              </label>
              <label style={{display:'flex',gap:6,cursor:'pointer',fontSize:12}}>
                <input type="checkbox" checked={form.combinabil} onChange={e=>setForm(p=>({...p,combinabil:e.target.checked}))}/>Combinabilă cu alte promoții
              </label>
            </div>

            {/* Condiții */}
            <div style={{marginTop:16}}>
              <div className="flex-between" style={{marginBottom:8}}>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',marginBottom:0}}>Condiții</label>
                <button className="btn btn-ghost btn-sm" onClick={addCond}>+ Condiție</button>
              </div>
              {form.conditii.map((cond,idx)=>(
                <ConditionRow key={idx} cond={cond} idx={idx} onChange={v=>updateCond(idx,v)} onRemove={()=>removeCond(idx)} products={products}/>
              ))}
            </div>

            {/* Acțiune */}
            <div style={{marginTop:16,background:'var(--bg)',borderRadius:8,padding:12}}>
              <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:10}}>Acțiune</label>
              <div className="form-group" style={{marginBottom:10}}>
                <label>Tip acțiune</label>
                <select className="w-full" value={form.actiune.tip} onChange={e=>setForm(p=>({...p,actiune:{...p.actiune,tip:e.target.value}}))}>
                  {TIPURI_ACTIUNE.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {(form.actiune.tip==='discount_procent_linie'||form.actiune.tip==='discount_valoric_linie'||form.actiune.tip==='produs_gratuit') && (
                <div className="form-group" style={{marginBottom:10}}>
                  <label>Produs țintă</label>
                  <select className="w-full" value={form.actiune.productIdTinta||''} onChange={e=>setForm(p=>({...p,actiune:{...p.actiune,productIdTinta:e.target.value}}))}>
                    <option value="">Selectează produs...</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              {form.actiune.tip!=='produs_gratuit' && (
                <div className="form-group" style={{marginBottom:10}}>
                  <label>{form.actiune.tip.includes('procent')?'Discount %':'Valoare RON'}</label>
                  <input type="number" min={0} step={0.1} className="w-full" value={form.actiune.valoare||0} onChange={e=>setForm(p=>({...p,actiune:{...p.actiune,valoare:parseFloat(e.target.value)||0}}))} />
                </div>
              )}
              {form.actiune.tip==='produs_gratuit' && (
                <div className="form-group" style={{marginBottom:10}}>
                  <label>Cantitate gratuită (role)</label>
                  <input type="number" min={1} className="w-full" value={form.actiune.cantitateGratuita||1} onChange={e=>setForm(p=>({...p,actiune:{...p.actiune,cantitateGratuita:parseInt(e.target.value)||1}}))} />
                </div>
              )}
              <div className="form-group" style={{marginBottom:0}}>
                <label>Etichetă afișată clientului</label>
                <input className="w-full" value={form.actiune.eticheta||''} onChange={e=>setForm(p=>({...p,actiune:{...p.actiune,eticheta:e.target.value}}))} placeholder="Ex: Gold -8% Patrice XXL" />
              </div>
            </div>

            {/* Restricții date */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12}}>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Data start (opțional)</label>
                <input type="text" className="w-full" value={form.restrictii?.dataStart||''} onChange={e=>setForm(p=>({...p,restrictii:{...p.restrictii,dataStart:e.target.value}}))} placeholder="DD/MM/YYYY"/>
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label>Data end (opțional)</label>
                <input type="text" className="w-full" value={form.restrictii?.dataEnd||''} onChange={e=>setForm(p=>({...p,restrictii:{...p.restrictii,dataEnd:e.target.value}}))} placeholder="DD/MM/YYYY"/>
              </div>
            </div>

            <button className="btn btn-primary w-full" style={{marginTop:16,justifyContent:'center'}} onClick={handleSave}>
              {isNew?'Creează regulă':'Salvează modificările'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
