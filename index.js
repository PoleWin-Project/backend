require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Test route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "PoleWin backend Express" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
