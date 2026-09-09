import { exportFile } from 'quasar'

/**
 * Exporta datos de una q-table a un archivo CSV/Excel en formato UTF-8 con BOM
 * @param {Array} columns Definición de columnas de q-table
 * @param {Array} rows Filas de datos (filtradas o completas)
 * @param {String} filename Nombre base del archivo
 */
export function exportTableToExcel(columns, rows, filename = 'reporte_planes_qi') {
  if (!rows || !rows.length) {
    return false
  }

  // Filtrar columnas visibles o estándar que tengan título
  const validCols = columns.filter(c => c.label && c.name !== 'acciones')

  // Cabecera
  const headerRow = validCols.map(col => `"${String(col.label).replace(/"/g, '""')}"`).join(',')

  // Filas
  const dataRows = rows.map(row => {
    return validCols.map(col => {
      let val = ''
      if (typeof col.field === 'function') {
        val = col.field(row)
      } else if (typeof col.field === 'string') {
        val = row[col.field]
      } else {
        val = row[col.name]
      }

      if (val === null || val === undefined) val = ''
      if (typeof val === 'object') val = JSON.stringify(val)

      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  })

  // Formato CSV con BOM \ufeff para compatibilidad total con Microsoft Excel
  const dateStr = new Date().toISOString().slice(0, 10)
  const status = exportFile(
    `${filename}_${dateStr}.csv`,
    '\ufeff' + [headerRow, ...dataRows].join('\r\n'),
    'text/csv;charset=utf-8'
  )

  return status
}
