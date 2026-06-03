import { useState } from 'react'
import { useStore } from '../StoreContext'
import api from '../api'

export default function SurveyPopup({ onDone }) {
  const { db } = useStore()
  const [step, setStep] = useState(0) // 0=prompt, 1=questions, 2=done
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)

  const survey = (db.surveys || [])[0]
  if (!survey) return null

  const questions = survey.questions || []

  async function handleSubmit() {
    setLoading(true)
    try {
      await api.surveys.submit(survey.id, answers)
      setStep(2)
      setTimeout(() => onDone?.(), 1500)
    } catch {
      onDone?.()
    }
    setLoading(false)
  }

  if (step === 0) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
        <h2 style={{ marginBottom: 8, fontSize: 20 }}>Bun venit!</h2>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
          Ajută-ne să îți personalizăm experiența completând un scurt chestionar despre firma ta. Durează sub 2 minute.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => onDone?.()}>Completez mai târziu</button>
          <button className="btn btn-primary" onClick={() => setStep(1)}>Completează acum →</button>
        </div>
      </div>
    </div>
  )

  if (step === 2) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: 360, width: '100%', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
        <h3>Mulțumim!</h3>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Răspunsurile au fost înregistrate.</p>
      </div>
    </div>
  )

  const sections = [...new Set(questions.map(q => q.section || 'general'))]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ maxWidth: 560, width: '100%', padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>{survey.name}</h2>
          {survey.description && <p style={{ color: 'var(--text2)', fontSize: 13 }}>{survey.description}</p>}
        </div>

        {sections.map(section => {
          const sqs = questions.filter(q => (q.section || 'general') === section)
          const label = sqs[0]?.section_label || section
          return (
            <div key={section} style={{ marginBottom: 20 }}>
              {sections.length > 1 && <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{label}</div>}
              {sqs.map(q => (
                <div key={q.id} className="form-group">
                  <label>{q.question_text}{q.is_required && <span style={{ color: 'var(--red-text)', marginLeft: 4 }}>*</span>}</label>
                  {(q.field_type === 'text' || q.field_type === 'email' || q.field_type === 'tel' || q.field_type === 'number') && (
                    <input type={q.field_type} className="w-full" value={answers[q.question_key] || ''} onChange={e => setAnswers(p => ({ ...p, [q.question_key]: e.target.value }))} />
                  )}
                  {q.field_type === 'textarea' && (
                    <textarea className="w-full" rows={3} value={answers[q.question_key] || ''} onChange={e => setAnswers(p => ({ ...p, [q.question_key]: e.target.value }))} />
                  )}
                  {(q.field_type === 'select' || q.field_type === 'radio') && (
                    <select className="w-full" value={answers[q.question_key] || ''} onChange={e => setAnswers(p => ({ ...p, [q.question_key]: e.target.value }))}>
                      <option value="">— Selectează —</option>
                      {(typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )
        })}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={() => onDone?.()}>Mai târziu</button>
          <button className="btn btn-primary" disabled={loading} onClick={handleSubmit}>{loading ? '...' : 'Trimite răspunsurile →'}</button>
        </div>
      </div>
    </div>
  )
}
