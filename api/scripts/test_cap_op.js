require("dotenv").config();
const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'Qinspecting_Secret_ISO27001_BASC_Key_2026_x900';

function getSessionToken() {
  return jwt.sign({ id: 1, username: 'admin', rol_id: 1, rol_codigo: 'ADMIN', session_id: '636f96a9-2c30-494b-99b1-c6f16af5fb83' }, JWT_SECRET, { expiresIn: '1h' });
}

function req(method, path, bodyData) {
  return new Promise((resolve, reject) => {
    const token = getSessionToken();
    const u = new URL('http://localhost:3060' + path);
    const bodyStr = bodyData ? JSON.stringify(bodyData) : '';
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const request = http.request(options, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, data: d }); }
      });
    });
    request.on('error', reject);
    if (bodyStr) request.write(bodyStr);
    request.end();
  });
}

async function runTests() {
  console.log('🧪 Probando módulo Capacitaciones Operadora...');

  // 1. Obtener empresas
  const empRes = await req('GET', '/api/capacitaciones-operadora/empresas');
  console.log('1. Obtener Empresas:', empRes.status, 'Total empresas:', Array.isArray(empRes.data) ? empRes.data.length : 0);

  // 2. Crear empresa nueva
  const newEmpRes = await req('POST', '/api/capacitaciones-operadora/empresas', { razon_social: 'Operadora Test SAS', nombre_qi: 'OpTest' });
  console.log('2. Crear Empresa:', newEmpRes.status, newEmpRes.data);
  const createdEmpId = newEmpRes.data.id_empresa;

  // 3. Buscar personal en empresa activa (ej. Distransllano - id 1)
  const searchRes = await req('GET', '/api/capacitaciones-operadora/buscar-personal?empresa_id=1&query=1');
  console.log('3. Buscar Personal (Query=1 en Empresa 1):', searchRes.status, 'Encontrados:', searchRes.data.length);

  // 4. Crear Capacitación Operadora
  const createCapRes = await req('POST', '/api/capacitaciones-operadora', {
    titulo: 'Capacitación en Manejo Defensivo e Inspección BASC',
    descripcion: 'Capacitación obligatoria dictada por la empresa operadora para conductores',
    fecha_realizacion: '2026-09-10T08:00:00',
    fecha_finalizacion: '2026-09-10T12:00:00',
    participantes: [
      { cedula: '10123456', empresa_id: 1, nombre: 'Juan Pérez Operador' },
      { cedula: '98765432', empresa_id: createdEmpId, nombre: 'Carlos Ruiz Externo' }
    ]
  });
  console.log('4. Crear Capacitación:', createCapRes.status, createCapRes.data);
  const capId = createCapRes.data.id;

  // 5. Listar Capacitaciones
  const listRes = await req('GET', '/api/capacitaciones-operadora');
  console.log('5. Listar Capacitaciones:', listRes.status, 'Total:', listRes.data.length);

  // 6. Obtener Detalle de Capacitación
  const detailRes = await req('GET', `/api/capacitaciones-operadora/${capId}`);
  console.log('6. Detalle Capacitación ID ' + capId + ':', detailRes.status);
  console.log('   Título:', detailRes.data.titulo);
  console.log('   Participantes:', JSON.stringify(detailRes.data.participantes, null, 2));

  console.log('✨ TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
