import { useState } from 'react'

export default function CopyButton({ text, children }) {
  const [copied, setCopied] = useState(false)
  function handleCopy(e) {
    e.stopPropagation()
    const doCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 1500) }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(doCopy).catch(() => {
        fallback(); doCopy()
      })
    } else { fallback(); doCopy() }
  }
  function fallback() {
    const ta = document.createElement('textarea')
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.focus(); ta.select()
    try { document.execCommand('copy') } catch {}
    document.body.removeChild(ta)
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={handleCopy}>
      {children}
      <span className="copy-btn" title="Copiază">{copied ? '✓' : '⧉'}</span>
    </span>
  )
}
