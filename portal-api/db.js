const sql = require('mssql')


const config = {
  server:   process.env.DB_SERVER   || 'localhost',
  database: process.env.DB_NAME     || 'GixenPortal',
  user:     process.env.DB_USER     || 'portal_gixen',
  password: process.env.DB_PASSWORD || '',
  port:     process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    connectTimeout:        30000,
    requestTimeout:        30000,  
options: {
    instanceName:          process.env.DB_INSTANCE || 'SQLEXPRESS01',
    encrypt:               process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    enableArithAbort:      true,

  },
  pool: {
    max: 10, min: 2, idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
  },
}

let pool = null

async function getPool() {
  if (!pool) {
    try {
      pool = await new sql.ConnectionPool(config).connect()
      console.log(`✅ SQL Server connected: ${config.server}\\${config.options.instanceName}/${config.database}`)
    } catch (err) {
      pool = null
      console.error(`❌ SQL Server connection failed:`, err.message)
      console.error(`   Server: ${config.server}\\${config.options.instanceName}`)
      console.error(`   User:   ${config.user}`)
      throw err
    }
  }
  return pool
}

async function query(sqlText, params = {}) {
  const p = await getPool()
  const req = p.request()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined) req.input(key, val)
  }
  return req.query(sqlText)
}

// Reconnect dacă conexiunea cade
process.on('uncaughtException', (err) => {
  if (err.code === 'ESOCKET' || err.code === 'ECONNRESET') {
    console.warn('SQL connection lost, will reconnect on next query')
    pool = null
  }
})

module.exports = { getPool, query, sql }
