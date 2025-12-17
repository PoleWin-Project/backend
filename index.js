require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Client } = require("pg");

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = YAML.load('./swagger.yaml');

const app = express();
const PORT = process.env.PORT || 8000;
const DATABASE_URL = process.env.DATABASE_URL;

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

let dbClient;

async function connectToDatabase() {
  if (!DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Skipping database connection.");
    return;
  }

  dbClient = new Client({ connectionString: DATABASE_URL });

  try {
    await dbClient.connect();
    console.log("Connected to PostgreSQL");
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error.message);
    dbClient = null;
  }
}

connectToDatabase();

// Health route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "PoleWin backend Express" });
});

// Simple DB test route
app.get("/api/db-check", async (req, res) => {
  if (!dbClient) {
    return res
      .status(500)
      .json({ status: "error", message: "Database not connected" });
  }

  try {
    const result = await dbClient.query("SELECT NOW() as now");
    res.json({ status: "ok", time: result.rows[0].now });
  } catch (error) {
    console.error("Database test query failed:", error.message);
    res
      .status(500)
      .json({ status: "error", message: "Database query failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
