// Servicio de Registro de Logs y Diagnóstico en tiempo real para Android, Electron y Web

const MAX_LOGS = 150
const STORAGE_KEY = 'qi_diagnostic_logs'

class DiagnosticLogger {
  constructor() {
    this.logs = this.loadLogs()
  }

  loadLogs() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  saveLogs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(-MAX_LOGS)))
    } catch {
      // Ignorar errores de almacenamiento cuotas
    }
  }

  log(type, message, details = null) {
    const entry = {
      id: Date.now() + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString(),
      type, // 'INFO' | 'WARN' | 'ERROR' | 'NETWORK'
      message: typeof message === 'object' ? JSON.stringify(message) : String(message),
      details: details ? (typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details)) : null
    }

    this.logs.unshift(entry)
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS)
    }

    this.saveLogs()

    // Duplicar en consola nativa del navegador / DevTools
    const consoleMsg = `[QI-${type}] ${entry.message}`
    if (type === 'ERROR') console.error(consoleMsg, details || '')
    else if (type === 'WARN') console.warn(consoleMsg, details || '')
    else console.log(consoleMsg, details || '')
  }

  info(msg, details) { this.log('INFO', msg, details) }
  warn(msg, details) { this.log('WARN', msg, details) }
  error(msg, details) { this.log('ERROR', msg, details) }
  network(msg, details) { this.log('NETWORK', msg, details) }

  getLogs() {
    return this.logs
  }

  clearLogs() {
    this.logs = []
    localStorage.removeItem(STORAGE_KEY)
  }

  exportLogsAsText() {
    return this.logs.map(l => `[${l.timestamp}] [${l.type}] ${l.message} ${l.details ? '\nDetalles: ' + l.details : ''}`).join('\n---\n')
  }
}

export const logger = new DiagnosticLogger()
