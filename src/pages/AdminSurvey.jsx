import { useState } from 'react'
import Layout from '../Layout'
import { useStore } from '../StoreContext'
import { fmtDate } from '../utils'
import api from '../api'

function Toast({msg,type,onDone}) {
  return <div className={`toast ${type}`} onClick={onDone} style={{cursor:'pointer'}}>{msg}</div>
}

const FIELD_TYPES = ['text','textarea','select','radio','checkbox','number','email','tel']

function ResultRow({ result, firms }) {
  const [expanded, setExpanded] = useState(false)
  const firm = firms.find(f=>f.id===result.customer_id)
  return (
    <div style={{marginBottom:10,border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--bg)',cursor:'pointer'}} onClick={()=>setExpanded(e=>!e)}>
        <div>
          <div style={{fontWeight:600,fontSize:13}}>{firm?.name||result.customer_name||result.customer_id}</div>
          <div style={{fontSize:11,color:'var(--text3)'}}>Completat: {fmtDate(result.completed_at)}</div>
        </div>
        <span style={{color:'var(--text3)',fontSize:18}}>{expanded?'▲':'▼'}</span>
      </div>
      {expanded && (
        <div style={{padding:'12px 16px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px'}}>
            {Object.entries(result.answers||{}).map(([k,v])=>v?(
              <div key={k} style={{display:'flex',gap:8,padding:'4px 0',borderBottom:'1px solid var(--border2)',fontSize:12}}>
                <span style={{color:'var(--text3)',minWidth:150,textTransform:'capitalize'}}>{k.replace(/_/g,' ')}</span>
                <span style={{fontWeight:500}}>{v}</span>
              </div>
            ):null)}
          </div>
        </div>
      )}
    </div>
  )
}

const EMPTY_QUESTION = { question_text:'', question_key:'', section:'general', section_label:'General', field_type:'text', is_required:false, options:'' }
const EMPTY_SURVEY   = { name:'Survey client', description:'', trigger_on:'first_login', is_active:true }

export default function AdminSurvey() {
  const { db, updateDb } = useStore()
  const [tab, setTab] = useState('survey')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)

  // Survey template editing
  const [editSurvey, setEditSurvey] = useState(null)
  const [newQ, setNewQ] = useState(EMPTY_QUESTION)
  const [addingQ, setAddingQ] = useState(false)

  // New survey creation
  const [creatingNew, setCreatingNew] = useState(false)
  const [newSurveyForm, setNewSurveyForm] = useState(EMPTY_SURVEY)

  const surveys = db.surveys||[]
  const results = db.survey_results||[]
  const firms = db.firms||[]
  const survey = surveys[0]

  function showToast(msg,type='success'){setToast({msg,type});setTimeout(()=>setToast(null),2500)}

  const completedCount = results.length
  const totalActive = firms.filter(f=>f.status==='activ').length
  const pendingCount = Math.max(0, totalActive - completedCount)

  async function refreshSurveys() {
    try {
      const data = await api.surveys.list()
      updateDb({ surveys: data })
    } catch {}
  }

  async function handleCreateSurvey() {
    if (!newSurveyForm.name) return showToast('Completează numele survey-ului','error')
    setLoading(true)
    try {
      await api.surveys.create(newSurveyForm)
      await refreshSurveys()
      setCreatingNew(false)
      setNewSurveyForm(EMPTY_SURVEY)
      showToast('Survey creat!')
    } catch(err) { showToast(err.message,'error') }
    setLoading(false)
  }

  async function handleUpdateSurvey() {
    if (!editSurvey?.name) return showToast('Completează numele','error')
    setLoading(true)
    try {
      await api.surveys.update(survey.id, editSurvey)
      await refreshSurveys()
      setEditSurvey(null)
      showToast('Survey actualizat!')
    } catch(err) { showToast(err.message,'error') }
    setLoading(false)
  }

  async function handleAddQuestion() {
    if (!survey) return
    if (!newQ.question_text) return showToast('Completează textul întrebării','error')
    const qKey = newQ.question_key || newQ.question_text.toLowerCase().replace(/[^a-z0-9]+/g,'_').slice(0,40)
    setLoading(true)
    try {
      const opts = newQ.options ? newQ.options.split('\n').map(s=>s.trim()).filter(Boolean) : undefined
      await api.surveys.addQuestion(survey.id, { ...newQ, question_key: qKey, options: opts })
      await refreshSurveys()
      setNewQ(EMPTY_QUESTION)
      setAddingQ(false)
      showToast('Întrebare adăugată!')
    } catch(err) { showToast(err.message,'error') }
    setLoading(false)
  }

  async function handleDeleteQuestion(qid) {
    if (!confirm('Ștergi această întrebare?')) return
    setLoading(true)
    try {
      await api.surveys.delQuestion(qid)
      await refreshSurveys()
      showToast('Întrebare ștearsă')
    } catch(err) { showToast(err.message,'error') }
    setLoading(false)
  }

  return (
    <Layout title="Survey clienți" subtitle="Gestionare chestionare profil client">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <div className="kpi-grid" style={{marginBottom:20}}>
        <div className="kpi-card"><div className="kpi-label">Completate</div><div className="kpi-val" style={{color:'var(--green)'}}>{completedCount}</div></div>
        <div className="kpi-card"><div className="kpi-label">În așteptare</div><div className="kpi-val" style={{color:'var(--orange-text)'}}>{pendingCount}</div></div>
        <div className="kpi-card"><div className="kpi-label">Total clienți activi</div><div className="kpi-val">{totalActive}</div></div>
        <div className="kpi-card">
          <div className="kpi-label">Rată completare</div>
          <div className="kpi-val">{totalActive>0?Math.round(completedCount/totalActive*100):0}%</div>
        </div>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid var(--border)'}}>
        {[['survey','Template survey'],['intrebari','Întrebări'],['rezultate','Rezultate']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:'8px 16px',background:'none',border:'none',borderBottom:tab===id?'2px solid var(--blue)':'2px solid transparent',color:tab===id?'var(--blue)':'var(--text2)',fontWeight:tab===id?600:400,fontSize:13,cursor:'pointer',marginBottom:-1}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: SURVEY TEMPLATE ── */}
      {tab==='survey' && (
        <div>
          {!survey && !creatingNew && (
            <div className="card" style={{textAlign:'center',padding:'48px'}}>
              <div style={{fontSize:48,marginBottom:16}}>📋</div>
              <div style={{fontSize:15,fontWeight:500,marginBottom:16}}>Niciun survey creat încă</div>
              <button className="btn btn-primary" onClick={()=>setCreatingNew(true)}>+ Crează survey</button>
            </div>
          )}

          {creatingNew && (
            <div className="card" style={{maxWidth:600}}>
              <div className="section-title" style={{marginBottom:16}}>Creare survey nou</div>
              <div className="form-group">
                <label>Nume survey *</label>
                <input className="w-full" value={newSurveyForm.name} onChange={e=>setNewSurveyForm(p=>({...p,name:e.target.value}))} placeholder="Ex: Profil client 2025"/>
              </div>
              <div className="form-group">
                <label>Descriere</label>
                <input className="w-full" value={newSurveyForm.description} onChange={e=>setNewSurveyForm(p=>({...p,description:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label>Trigger</label>
                <select className="w-full" value={newSurveyForm.trigger_on} onChange={e=>setNewSurveyForm(p=>({...p,trigger_on:e.target.value}))}>
                  <option value="first_login">Prima logare</option>
                  <option value="on_demand">La cerere</option>
                  <option value="until_completed">Mereu, până la completare</option>
                </select>
              </div>
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button className="btn btn-secondary" onClick={()=>setCreatingNew(false)}>Anulează</button>
                <button className="btn btn-primary" disabled={loading} onClick={handleCreateSurvey}>{loading?'...':'Creează'}</button>
              </div>
            </div>
          )}

          {survey && (
            <div className="card" style={{maxWidth:600}}>
              {editSurvey ? (
                <>
                  <div className="section-title" style={{marginBottom:16}}>Editează survey</div>
                  <div className="form-group">
                    <label>Nume *</label>
                    <input className="w-full" value={editSurvey.name} onChange={e=>setEditSurvey(p=>({...p,name:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label>Descriere</label>
                    <input className="w-full" value={editSurvey.description||''} onChange={e=>setEditSurvey(p=>({...p,description:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label>Trigger</label>
                    <select className="w-full" value={editSurvey.trigger_on} onChange={e=>setEditSurvey(p=>({...p,trigger_on:e.target.value}))}>
                      <option value="first_login">Prima logare</option>
                      <option value="on_demand">La cerere</option>
                      <option value="until_completed">Mereu, până la completare</option>
                    </select>
                  </div>
                  <div className="form-group" style={{display:'flex',alignItems:'center',gap:10}}>
                    <input type="checkbox" id="sact" checked={!!editSurvey.is_active} onChange={e=>setEditSurvey(p=>({...p,is_active:e.target.checked}))}/>
                    <label htmlFor="sact" style={{marginBottom:0}}>Survey activ</label>
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:16}}>
                    <button className="btn btn-secondary" onClick={()=>setEditSurvey(null)}>Anulează</button>
                    <button className="btn btn-primary" disabled={loading} onClick={handleUpdateSurvey}>{loading?'...':'Salvează'}</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-between" style={{marginBottom:16}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:16}}>{survey.name}</div>
                      <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{survey.description}</div>
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{fontSize:11,padding:'3px 10px',borderRadius:10,background:'var(--green-bg)',color:'var(--green-text)',fontWeight:700}}>
                        {survey.is_active?'Activ':'Inactiv'}
                      </span>
                      <button className="btn btn-secondary btn-sm" onClick={()=>setEditSurvey({name:survey.name,description:survey.description,trigger_on:survey.trigger_on||'first_login',is_active:survey.is_active})}>✏ Editează</button>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:16,fontSize:13,marginBottom:16}}>
                    <div><span style={{color:'var(--text3)'}}>Trigger: </span><strong>{survey.trigger_on}</strong></div>
                    <div><span style={{color:'var(--text3)'}}>Întrebări: </span><strong>{survey.questions?.length||0}</strong></div>
                  </div>
                  <div style={{background:'var(--blue-bg)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--blue-text)'}}>
                    ℹ Survey-ul apare ca pop-up la prima logare a clientului după aprobarea contului.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ÎNTREBĂRI ── */}
      {tab==='intrebari' && (
        <div>
          {!survey ? (
            <div className="card" style={{textAlign:'center',padding:'32px',color:'var(--text3)'}}>
              Creează mai întâi un survey din tab-ul "Template survey".
            </div>
          ) : (
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div style={{fontWeight:600,fontSize:15}}>{survey.name} — {survey.questions?.length||0} întrebări</div>
                <button className="btn btn-primary btn-sm" onClick={()=>setAddingQ(v=>!v)}>{addingQ?'Anulează':'+ Adaugă întrebare'}</button>
              </div>

              {addingQ && (
                <div className="card" style={{marginBottom:16,background:'var(--blue-bg)',border:'1px solid var(--blue)'}}>
                  <div className="section-title" style={{marginBottom:12}}>Întrebare nouă</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label>Text întrebare *</label>
                      <input className="w-full" value={newQ.question_text} onChange={e=>setNewQ(p=>({...p,question_text:e.target.value}))} placeholder="Ex: Care este principalul vostru domeniu de activitate?"/>
                    </div>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label>Cheie câmp (snake_case)</label>
                      <input className="w-full" value={newQ.question_key} onChange={e=>setNewQ(p=>({...p,question_key:e.target.value}))} placeholder="domeniu_activitate (auto dacă e gol)"/>
                    </div>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label>Secțiune</label>
                      <input className="w-full" value={newQ.section} onChange={e=>setNewQ(p=>({...p,section:e.target.value}))} placeholder="general"/>
                    </div>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label>Label secțiune</label>
                      <input className="w-full" value={newQ.section_label} onChange={e=>setNewQ(p=>({...p,section_label:e.target.value}))} placeholder="Informații generale"/>
                    </div>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label>Tip câmp</label>
                      <select className="w-full" value={newQ.field_type} onChange={e=>setNewQ(p=>({...p,field_type:e.target.value}))}>
                        {FIELD_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{marginBottom:0,display:'flex',alignItems:'center',gap:10,paddingTop:20}}>
                      <input type="checkbox" id="reqchk" checked={!!newQ.is_required} onChange={e=>setNewQ(p=>({...p,is_required:e.target.checked}))}/>
                      <label htmlFor="reqchk" style={{marginBottom:0}}>Obligatoriu</label>
                    </div>
                  </div>
                  {(newQ.field_type==='select'||newQ.field_type==='radio'||newQ.field_type==='checkbox') && (
                    <div className="form-group">
                      <label>Opțiuni (câte una pe linie)</label>
                      <textarea className="w-full" rows={4} value={newQ.options} onChange={e=>setNewQ(p=>({...p,options:e.target.value}))} placeholder="Opțiune 1&#10;Opțiune 2&#10;Opțiune 3"/>
                    </div>
                  )}
                  <button className="btn btn-primary" disabled={loading} onClick={handleAddQuestion}>{loading?'...':'Adaugă întrebare'}</button>
                </div>
              )}

              {(survey.questions||[]).length === 0 ? (
                <div className="card" style={{textAlign:'center',padding:'32px',color:'var(--text3)'}}>
                  Nicio întrebare. Adaugă prima întrebare folosind butonul de mai sus.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Întrebare</th><th>Cheie</th><th>Tip</th><th>Secțiune</th><th>Obligatoriu</th><th></th></tr>
                    </thead>
                    <tbody>
                      {(survey.questions||[]).map((q,i)=>(
                        <tr key={q.id}>
                          <td style={{color:'var(--text3)'}}>{i+1}</td>
                          <td style={{fontWeight:500}}>{q.question_text}</td>
                          <td><code style={{fontSize:11,background:'var(--bg3)',padding:'1px 6px',borderRadius:4}}>{q.question_key}</code></td>
                          <td style={{color:'var(--text3)',fontSize:12}}>{q.field_type}</td>
                          <td style={{fontSize:12,color:'var(--text3)'}}>{q.section_label||q.section}</td>
                          <td>{q.is_required?<span style={{color:'var(--red-text)',fontWeight:700}}>Da</span>:<span style={{color:'var(--text3)'}}>Nu</span>}</td>
                          <td><button className="btn btn-danger btn-sm" disabled={loading} onClick={()=>handleDeleteQuestion(q.id)}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: REZULTATE ── */}
      {tab==='rezultate' && (
        <div>
          {pendingCount > 0 && (
            <div className="card" style={{marginBottom:14}}>
              <div className="section-title" style={{marginBottom:12,color:'var(--orange-text)'}}>⏳ Clienți care nu au completat ({pendingCount})</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Firmă</th><th>Email</th><th>Acțiune</th></tr></thead>
                  <tbody>
                    {firms.filter(f=>f.status==='activ'&&!results.some(r=>r.customer_id===f.id)).map(f=>(
                      <tr key={f.id}>
                        <td style={{fontWeight:500}}>{f.name}</td>
                        <td style={{color:'var(--text3)'}}>{f.email}</td>
                        <td><button className="btn btn-secondary btn-sm" onClick={()=>showToast('Email reminder trimis!')}>📧 Trimite reminder</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="card">
              <div className="section-title" style={{marginBottom:12,color:'var(--green-text)'}}>✓ Survey completat ({results.length})</div>
              {results.map(result=><ResultRow key={result.id} result={result} firms={firms}/>)}
            </div>
          )}

          {results.length===0&&pendingCount===0 && (
            <div className="card" style={{textAlign:'center',padding:'48px',color:'var(--text3)'}}>
              <div style={{fontSize:48,marginBottom:16}}>📊</div>
              <div>Niciun rezultat încă.</div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
