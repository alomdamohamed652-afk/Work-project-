const { pool } = require("./db");

async function sendExpoPush(tokens, title, body, data = {}) {
  const valid = [...new Set((tokens || []).filter(t => typeof t === "string" && t.startsWith("ExponentPushToken[")))];
  if (!valid.length) return;
  try {
    const messages = valid.map(to => ({ to, sound: "default", title, body, data }));
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages)
    });
    if (!response.ok) console.error("Expo push failed", response.status, await response.text());
  } catch (error) {
    console.error("Expo push error", error);
  }
}

async function notifyUser(userId, title, body, type = "order", data = {}) {
  await pool.query(`INSERT INTO notifications(user_id,title,body,type,data) VALUES($1,$2,$3,$4,$5)`, [userId, title, body, type, JSON.stringify(data)]);
  try {
    const { rows } = await pool.query("SELECT token FROM expo_push_tokens WHERE user_id=$1", [userId]);
    await sendExpoPush(rows.map(r => r.token), title, body, data);
  } catch (error) { console.error("Push token lookup failed", error); }
}

async function notifyUsers(userIds, title, body, type = "order", data = {}) {
  for (const userId of [...new Set(userIds.filter(Boolean))]) await notifyUser(userId, title, body, type, data);
}

async function notifyRole(role, title, body, type = "order", data = {}, extraWhere = "") {
  const { rows } = await pool.query(`SELECT id FROM users WHERE role=$1 AND status='active' ${extraWhere}`, [role]);
  await notifyUsers(rows.map(r => r.id), title, body, type, data);
}

module.exports = { sendExpoPush, notifyUser, notifyUsers, notifyRole };
