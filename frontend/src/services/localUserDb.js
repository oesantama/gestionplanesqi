// Base de Datos Local de Usuarios para Autenticación 100% Offline
import { logger } from './logger'

const LOCAL_USERS_KEY = 'qi_local_users_db'
const LEGACY_USERS_KEY = 'qi_offline_users'

export class LocalUserDbService {
  getDB() {
    try {
      const raw = localStorage.getItem(LOCAL_USERS_KEY) || localStorage.getItem(LEGACY_USERS_KEY) || '{}'
      return JSON.parse(raw)
    } catch (err) {
      logger.error('Error leyendo base local de usuarios:', err.message)
      return {}
    }
  }

  saveUser(username, password, token, usuario) {
    if (!username || !usuario) return

    try {
      const db = this.getDB()
      const primaryKey = username.trim().toLowerCase()

      const record = {
        username: username.trim(),
        password,
        token,
        usuario,
        updatedAt: Date.now()
      }

      db[primaryKey] = record

      // Indexar por correo electrónico si existe
      if (usuario.email && typeof usuario.email === 'string') {
        const emailKey = usuario.email.trim().toLowerCase()
        db[emailKey] = record
      }

      // Indexar por nombre de usuario interno si difiere
      if (usuario.usuario && typeof usuario.usuario === 'string') {
        const uKey = usuario.usuario.trim().toLowerCase()
        db[uKey] = record
      }

      const serialized = JSON.stringify(db)
      localStorage.setItem(LOCAL_USERS_KEY, serialized)
      localStorage.setItem(LEGACY_USERS_KEY, serialized)

      logger.info(`Usuario [${username}] guardado/actualizado en la base local de usuarios para uso offline.`)
    } catch (err) {
      logger.error('Error guardando usuario en base local:', err.message)
    }
  }

  authenticate(inputUsername, inputPassword) {
    if (!inputUsername) return { status: 'USER_NOT_FOUND' }

    const db = this.getDB()
    const searchKey = inputUsername.trim().toLowerCase()

    // 1. Coincidencia directa por clave indexada
    let matched = db[searchKey]

    // 2. Búsqueda exhaustiva en la tabla si la clave directa falló
    if (!matched) {
      const records = Object.values(db)
      matched = records.find(rec => {
        if (!rec) return false
        const uName = rec.username ? rec.username.trim().toLowerCase() : ''
        const uEmail = rec.usuario && rec.usuario.email ? rec.usuario.email.trim().toLowerCase() : ''
        const uUser = rec.usuario && rec.usuario.usuario ? rec.usuario.usuario.trim().toLowerCase() : ''
        return uName === searchKey || uEmail === searchKey || uUser === searchKey
      })
    }

    if (!matched) {
      return { status: 'USER_NOT_FOUND' }
    }

    if (matched.password !== inputPassword) {
      return { status: 'INVALID_PASSWORD', user: matched }
    }

    return { status: 'SUCCESS', user: matched }
  }
}

export const localUserDb = new LocalUserDbService()
