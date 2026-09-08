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

require("./routes/tables")(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`gestionplanesqi-api escuchando en el puerto ${PORT}`);
  console.log(`Database: ${process.env.DB_NAME}`);
});
