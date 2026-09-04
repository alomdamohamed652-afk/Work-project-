const express = require("express");
const { pool } = require("./db");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const healthRoutes = require("./routes/health");
const categoryRoutes = require("./routes/categories");
const restaurantRoutes = require("./routes/restaurants");
const locationRoutes = require("./routes/location");
const orderRoutes = require("./routes/orders");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));
app.get("/", (_req, res) => res.json({ name: "Waselni API", status: "running" }));
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/orders", orderRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  await pool.query("SELECT 1");
  app.listen(port, "0.0.0.0", () => console.log(`API listening on port ${port}`));
}
start().catch((error) => {
  console.error("Unable to start API:", error);
  process.exit(1);
});
