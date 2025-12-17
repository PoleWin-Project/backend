require("dotenv").config();
const express = require("express");
const cors = require("cors");

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = YAML.load('./swagger.yaml');

const app = express();
const PORT = process.env.PORT || 8000;

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Test route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "PoleWin backend Express" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
