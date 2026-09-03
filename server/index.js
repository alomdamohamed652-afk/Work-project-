const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

app.get("/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");
    res.json({
      ok: true,
      service: "work-project-api",
      database: "connected",
      databaseTime: result.rows[0].database_time,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(503).json({
      ok: false,
      service: "work-project-api",
      database: "disconnected"
    });
  }
});

app.get("/", (_req, res) => {
  res.json({
    name: "Work-project API",
    status: "running"
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on port ${port}`);
});