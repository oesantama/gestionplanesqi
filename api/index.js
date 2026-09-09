require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const app = express();
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => res.json({ status: "OK" }));

// Registro de rutas del sistema
require("./routes/auth")(app);
require("./routes/menu")(app);
require("./routes/tables")(app);
require("./routes/empresas")(app);
require("./routes/planes")(app);
require("./routes/planesEmpresas")(app);
require("./routes/empleados")(app);
require("./routes/mensajes")(app);
require("./routes/usuarios")(app);
require("./routes/perfil")(app);
require("./routes/bitacora")(app);
require("./routes/dashboard")(app);
require("./routes/capacitacionesOperadora")(app);

const PORT = process.env.PORT || 3060;
app.listen(PORT, () => {
  console.log(`gestionplanesqi-api escuchando en el puerto ${PORT}`);
  console.log(`Database: ${process.env.DB_NAME}`);
});
