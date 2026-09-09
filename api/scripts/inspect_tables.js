const pool = require("../database");

async function inspect() {
  const tables = ["Empleados", "Empresas", "mensajes", "planes", "Planes_empresas"];
  for (const t of tables) {
    console.log("=== TABLE:", t, "===");
    try {
      const [create] = await pool.query(`SHOW CREATE TABLE \`${t}\``);
      console.log(create[0]["Create Table"]);
      const [rows] = await pool.query(`SELECT * FROM \`${t}\` LIMIT 3`);
      console.log("Sample rows count:", rows.length);
      console.log(JSON.stringify(rows, null, 2));
    } catch(e) {
      console.error("Error inspecting", t, ":", e);
    }
  }
  process.exit(0);
}

inspect();
