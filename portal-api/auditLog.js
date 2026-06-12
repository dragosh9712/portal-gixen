// ── Audit log ──
// Loghează ORICE acțiune din portal în tabela SQL `audit_log`:
//  - toate cererile care modifică date (POST / PUT / DELETE / PATCH) — cine, ce, cu ce payload, ce status
//  - login-urile (reușite + eșuate, prin ruta de auth)
//  - job-urile de sistem (curs BNR, monitor plăți proforme) — via logSystem()
// Nu se afișează nicăieri în UI — rămâne doar în SQL pentru investigații.

const { query } = require('./db')

let tableEnsured = false
async function ensureTable() {
  if (tableEnsured) return
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='audit_log')
    CREATE TABLE audit_log (
      id           BIGINT IDENTITY(1,1) PRIMARY KEY,
      occurred_at  DATETIME2 DEFAULT SYSDATETIME(),
      actor_type   VARCHAR(20),       -- 'admin' | 'client' | 'system' | 'anonim'
      actor_id     VARCHAR(64),       -- users.id sau NULL
      actor_email  NVARCHAR(255),
      customer_id  VARCHAR(64),       -- firma actorului (pentru clienți)
      action       VARCHAR(16),       -- POST / PUT / DELETE / PATCH / JOB / LOGIN
      resource     NVARCHAR(400),     -- ruta API sau numele job-ului
      status_code  INT,               -- HTTP status (NULL pentru job-uri)
      ip           VARCHAR(64),
      details      NVARCHAR(MAX)      -- payload-ul cererii (JSON, fără parole) sau detalii job
    )`)
  await query(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_audit_log_occurred' AND object_id=OBJECT_ID('audit_log'))
    CREATE INDEX IX_audit_log_occurred ON audit_log (occurred_at DESC)`)
  tableEnsured = true
}

const SENSITIVE_KEYS = ['password', 'parola', 'password_hash', 'newpassword', 'currentpassword', 'token', 'hash']

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = Array.isArray(obj) ? [] : {}
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(k.toLowerCase())) out[k] = '***'
    else if (v && typeof v === 'object') out[k] = sanitize(v)
    else out[k] = v
  }
  return out
}

async function writeEntry(entry) {
  try {
    await ensureTable()
    await query(`
      INSERT INTO audit_log (actor_type, actor_id, actor_email, customer_id, action, resource, status_code, ip, details)
      VALUES (@atype, @aid, @aemail, @cid, @action, @resource, @status, @ip, @details)`, {
      atype:    entry.actor_type || 'anonim',
      aid:      entry.actor_id || null,
      aemail:   entry.actor_email || null,
      cid:      entry.customer_id || null,
      action:   String(entry.action || '').slice(0, 16),
      resource: String(entry.resource || '').slice(0, 400),
      status:   entry.status_code ?? null,
      ip:       entry.ip || null,
      details:  entry.details ? String(entry.details).slice(0, 100000) : null,
    })
  } catch (e) {
    // Auditul nu trebuie să strice niciodată aplicația
    console.error('[audit] write error:', e.message)
  }
}

// Middleware Express: loghează toate cererile care modifică date.
// Montat ÎNAINTE de rute — req.user e populat de authenticateToken până la 'finish'.
function auditMiddleware(req, res, next) {
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)
  if (!isMutation || !req.path.startsWith('/api/')) return next()

  res.on('finish', () => {
    const u = req.user || null
    const isLogin = req.path === '/api/auth/login'
    let details = null
    try {
      if (req.body && Object.keys(req.body).length) details = JSON.stringify(sanitize(req.body))
      else if (req.file) details = JSON.stringify({ file: req.file.originalname, size: req.file.size })
    } catch { /* body nelogabil */ }

    writeEntry({
      actor_type:  u ? (u.role === 'admin' ? 'admin' : 'client') : (isLogin ? 'anonim' : 'anonim'),
      actor_id:    u?.id || null,
      actor_email: u?.email || (isLogin ? (req.body?.email || null) : null),
      customer_id: u?.customerId || null,
      action:      isLogin ? 'LOGIN' : req.method,
      resource:    req.originalUrl || req.path,
      status_code: res.statusCode,
      ip:          (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim(),
      details,
    })
  })
  next()
}

// Pentru job-uri de sistem (curs valutar, monitor plăți etc.)
function logSystem(resource, details) {
  writeEntry({
    actor_type: 'system',
    action: 'JOB',
    resource,
    details: typeof details === 'string' ? details : JSON.stringify(details || {}),
  })
}

module.exports = { auditMiddleware, logSystem, ensureTable }
