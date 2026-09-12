const pool = require("../database");
const { decrypt, isEncrypted } = require("../helpers/encryption");

async function fixEmpresasBase() {
  console.log("=================================================");
  console.log("🔓 DESENCRIPTANDO COLUMNA 'base' EN TABLA Empresas");
  console.log("=================================================\n");

  try {
    const [rows] = await pool.query("SELECT Id_empresa, Razon_social, base FROM Empresas");
    let count = 0;

    for (const r of rows) {
      if (r.base && isEncrypted(r.base)) {
        const plainBase = decrypt(r.base);
        await pool.query("UPDATE Empresas SET base = ? WHERE Id_empresa = ?", [plainBase, r.Id_empresa]);
        count++;
        console.log(`✅ [Id ${r.Id_empresa}] ${r.Razon_social}: '${r.base.substring(0, 30)}...' -> '${plainBase}'`);
      } else {
        console.log(`ℹ️ [Id ${r.Id_empresa}] ${r.Razon_social}: ya en texto plano -> '${r.base}'`);
      }
    }

    console.log(`\n🎉 Proceso finalizado. ${count} empresa(s) actualizada(s) a texto plano.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error descifrando columna base:", err);
    process.exit(1);
  }
}

fixEmpresasBase();
