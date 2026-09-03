const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");
    res.json({ ok: true, database: "connected", databaseTime: result.rows[0].database_time });
  } catch (error) {
    console.error(error);
    res.status(503).json({ ok: false, database: "disconnected" });
  }
});

module.exports = router;