const mysql = require("mysql2/promise");

// Pool de conexiones (reconexión automática, múltiples conexiones
// concurrentes) -- mysql2 soporta async/await de forma nativa, sin
// necesidad de util.promisify.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  waitForConnections: true,
  queueLimit: 0,
});

module.exports = pool;
