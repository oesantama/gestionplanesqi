<template>
  <q-card class="qi-card overflow-hidden">
    <div class="qi-table-wrapper overflow-auto">
      <q-table
        :rows="rows"
        :columns="columns"
        :row-key="rowKey"
        :filter="filterText"
        :loading="loading"
        :grid="grid || $q.screen.lt.sm"
        dark
        flat
        :dense="dense"
        :no-data-label="noDataLabel"
        class="qi-custom-table"
        v-bind="$attrs"
      >
        <!-- Cabecera Superior: Título, Buscador, Botones de Acción y Exportar -->
        <template #top>
          <div class="row full-width items-center justify-between q-col-gutter-sm q-py-xs">
            <div class="col-xs-12 col-sm-auto row items-center justify-between q-gutter-sm">
              <div v-if="title" class="text-h6 text-weight-bold text-white">{{ title }}</div>
              <slot name="title-extra"></slot>
            </div>

            <div class="col-xs-12 col-sm-auto row items-center q-gutter-xs justify-end flex-wrap full-width-mobile">
              <!-- Acciones Extra a la Izquierda del Buscador -->
              <slot name="top-actions"></slot>

              <!-- Campo de Búsqueda Reactiva -->
              <q-input
                v-if="showSearch"
                v-model="filterText"
                outlined
                dark
                dense
                :placeholder="placeholder"
                color="primary"
                class="qi-search-input"
              >
                <template #prepend>
                  <q-icon name="search" color="primary" />
                </template>
                <template #append v-if="filterText">
                  <q-icon name="close" class="cursor-pointer" @click="filterText = ''" />
                </template>
              </q-input>

              <!-- Botón de Exportación a Excel -->
              <q-btn
                v-if="showExport"
                color="positive"
                icon="file_download"
                label="Exportar Excel"
                no-caps
                unelevated
                class="text-weight-bold"
                @click="handleExport"
              />
            </div>
          </div>
        </template>

        <!-- Modo Grid (Tarjetas Responsivas para Móviles) -->
        <template #item="props">
          <div class="q-pa-xs col-xs-12 col-sm-6 col-md-4">
            <q-card dark class="bg-dark qi-card q-pa-md shadow-6" style="border: 1px solid rgba(0, 210, 106, 0.25);">
              <div class="row items-center justify-between q-mb-xs">
                <div class="text-subtitle1 text-weight-bold text-primary word-break-all">
                  {{ getPrimaryTitle(props) }}
                </div>
                <div v-if="hasSlot('body-cell-acciones')">
                  <slot name="body-cell-acciones" v-bind="getSlotProps(props, 'acciones')"></slot>
                </div>
              </div>

              <q-separator dark class="q-my-xs" style="opacity: 0.3;" />

              <div class="q-gutter-y-xs">
                <div
                  v-for="col in props.cols.filter(c => c.name !== 'acciones' && c.name !== props.cols[0]?.name)"
                  :key="col.name"
                  class="row items-center justify-between text-caption q-py-xs"
                  style="border-bottom: 1px dashed rgba(255, 255, 255, 0.08);"
                >
                  <span class="text-grey-4 text-weight-medium q-mr-sm">{{ col.label }}:</span>
                  <span class="text-weight-bold text-white text-right word-break-all">
                    <slot :name="`body-cell-${col.name}`" v-bind="getSlotProps(props, col.name)">
                      {{ col.value }}
                    </slot>
                  </span>
                </div>
              </div>
            </q-card>
          </div>
        </template>

        <!-- Reenviar dinámicamente todos los slots de celdas en modo Tabla Desktop -->
        <template v-for="col in columns" :key="col.name" #[`body-cell-${col.name}`]="props">
          <slot :name="`body-cell-${col.name}`" v-bind="props">
            <q-td :props="props">
              {{ props.value }}
            </q-td>
          </slot>
        </template>
      </q-table>
    </div>
  </q-card>
</template>

<script setup>
import { ref, computed, useSlots } from 'vue'
import { useQuasar } from 'quasar'
import { exportTableToExcel } from '../utils/exportExcel'

const $q = useQuasar()
const slots = useSlots()

const props = defineProps({
  title: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  loading: { type: Boolean, default: false },
  grid: { type: Boolean, default: false },
  exportFilename: { type: String, default: 'reporte' },
  showSearch: { type: Boolean, default: true },
  showExport: { type: Boolean, default: true },
  placeholder: { type: String, default: 'Buscar en tabla...' },
  noDataLabel: { type: String, default: 'No se encontraron registros' },
  dense: { type: Boolean, default: true },
  filter: { type: String, default: undefined }
})

const emit = defineEmits(['update:filter', 'request'])

const internalFilter = ref('')

const filterText = computed({
  get: () => props.filter !== undefined ? props.filter : internalFilter.value,
  set: (val) => {
    internalFilter.value = val
    emit('update:filter', val)
  }
})

function hasSlot(name) {
  return !!slots[name]
}

function getPrimaryTitle(props) {
  if (props.cols && props.cols.length > 0) {
    const firstCol = props.cols[0]
    return firstCol.value || props.row[firstCol.field] || props.key
  }
  return props.key
}

function getSlotProps(props, colName) {
  const colObj = props.colsMap ? props.colsMap[colName] : props.cols.find(c => c.name === colName)
  return {
    row: props.row,
    col: colObj || { name: colName, label: colName },
    value: props.row[colName] !== undefined ? props.row[colName] : (colObj ? colObj.value : undefined),
    key: props.key,
    pageIndex: props.pageIndex,
    rowIndex: props.rowIndex
  }
}

function handleExport() {
  exportTableToExcel(props.columns, props.rows, props.exportFilename)
}
</script>

<style scoped>
.qi-card {
  border-radius: 12px;
  background: rgba(12, 28, 22, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 210, 106, 0.15);
}

.qi-search-input {
  min-width: 200px;
}

@media (max-width: 599px) {
  .full-width-mobile {
    width: 100%;
  }
  .qi-search-input {
    width: 100%;
    min-width: 100%;
  }
}

.word-break-all {
  word-break: break-all;
  overflow-wrap: anywhere;
}

.qi-table-wrapper {
  max-width: 100%;
  overflow-x: auto;
}
</style>
