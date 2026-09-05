const express = require("express");
const { pool } = require("./db");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const healthRoutes = require("./routes/health");
const categoryRoutes = require("./routes/categories");
const restaurantRoutes = require("./routes/restaurants");
const menuRoutes = require("./routes/menu");
const invitationRoutes = require("./routes/invitations");
const locationRoutes = require("./routes/location");
const orderRoutes = require("./routes/orders");
const financeRoutes = require("./routes/finance");
const notificationRoutes = require("./routes/notifications");
const couponRoutes = require("./routes/coupons");
const customerRoutes = require("./routes/customer");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));
app.get("/", (_req, res) => res.json({ name: "Waselni API", status: "running" }));
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/finance", financeRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin/coupons", couponRoutes);
app.use("/api/customer", customerRoutes);

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
