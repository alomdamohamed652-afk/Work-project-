const express = require("express");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "work-project-api",
    timestamp: new Date().toISOString()
  });
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