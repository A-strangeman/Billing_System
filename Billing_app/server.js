// server.js
import express from "express";
import session from "express-session";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

/* ─────────────────────────────────────────────
   Setup (ESM __dirname / env)
────────────────────────────────────────────── */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from Billing_app/.env (same folder as this file)
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 4000;

/* ─────────────────────────────────────────────
   MySQL pool  (IMPORTANT: we use ONLY `db`)
────────────────────────────────────────────── */
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "billing_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* ─────────────────────────────────────────────
   Middleware
────────────────────────────────────────────── */
app.use(cors({
  origin: true,         // in dev, allow any origin that sends credentials
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    // secure: true, // enable if serving over HTTPS
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// (optional) serve static files from ./public
app.use(express.static(path.join(__dirname, "public")));

/* ─────────────────────────────────────────────
   Helpers
────────────────────────────────────────────── */
const requireAuth = (req, res, next) => {
  if (req.session?.userId) return next();
  return res.status(401).json({ success: false, message: "Unauthorized" });
};

const toJSONString = (val) => {
  if (val == null) return "[]";
  if (typeof val === "string") return val;
  try { return JSON.stringify(val); } catch { return "[]"; }
};

const parseItems = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return []; }
};

const toNum = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

const buildBillDataRow = (row) => {
  // Frontend expects billData as a JSON STRING
  const billObj = {
    estimateNo: row.estimate_no ?? "",
    customerName: row.customer_name ?? "",
    customerPhone: row.customer_phone ?? "",
    billDate: row.bill_date ?? null,
    items: parseItems(row.items),
    subTotal: toNum(row.sub_total),
    discount: toNum(row.discount),
    grandTotal: toNum(row.grand_total),
    received: toNum(row.received),
    balance: toNum(row.balance),
    amountWords: row.amount_words ?? ""
  };
  return JSON.stringify(billObj);
};

/* ─────────────────────────────────────────────
   Health / Self-check
────────────────────────────────────────────── */
app.get("/api/health", async (_req, res) => {
  try {
    const conn = await db.getConnection();
    conn.release();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ─────────────────────────────────────────────
   Auth (simple env-based "admin")
   Set in .env:
     ADMIN_EMAIL=admin@example.com
     ADMIN_PASSWORD=yourpassword
────────────────────────────────────────────── */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "").trim();

  if (
    (email || "").trim().toLowerCase() === ADMIN_EMAIL &&
    (password || "").trim() === ADMIN_PASSWORD
  ) {
    // use constant "admin" (aligns with your data)
    req.session.userId = "admin";
    return res.json({ success: true, userId: "admin" });
  }
  return res.status(401).json({ success: false, message: "Invalid email or password" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get("/api/me", (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, userId: req.session.userId });
});

/* ─────────────────────────────────────────────
   Bills — CRUD  (matches your `bills` schema)
   bills:
     id (AI), estimate_no (UNIQUE), customer_name, customer_phone,
     bill_date (DATE), items (JSON), sub_total, discount, grand_total,
     received, balance, amount_words (TEXT), user_id (VARCHAR),
     created_at, updated_at (TIMESTAMPs with defaults)
────────────────────────────────────────────── */

/**
 * Create or Update (upsert by estimate_no + user_id check)
 * Body keys expected:
 *   estimateNo, customerName, customerPhone, billDate (YYYY-MM-DD),
 *   items (array/object/string JSON), subTotal, discount, grandTotal,
 *   received, balance, amountWords
 */
app.post("/api/save-bill", requireAuth, async (req, res) => {
  const b = req.body || {};
  const userId = req.session.userId;

  if (!b.estimateNo || !b.customerName) {
    return res.status(400).json({ success: false, message: "estimateNo and customerName are required" });
  }

  const itemsStr = toJSONString(b.items);
  const billDate = b.billDate || null;

  try {
    const [existing] = await db.query(
      "SELECT id FROM bills WHERE estimate_no = ? AND user_id = ?",
      [String(b.estimateNo), userId]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE bills
         SET customer_name=?, customer_phone=?, bill_date=?, items=?,
             sub_total=?, discount=?, grand_total=?, received=?, balance=?, amount_words=?
         WHERE id=?`,
        [
          b.customerName || "",
          b.customerPhone || "",
          billDate,
          itemsStr,
          toNum(b.subTotal),
          toNum(b.discount),
          toNum(b.grandTotal),
          toNum(b.received),
          toNum(b.balance),
          b.amountWords || "",
          existing[0].id
        ]
      );
      return res.json({ success: true, action: "updated" });
    } else {
      await db.query(
        `INSERT INTO bills
         (estimate_no, customer_name, customer_phone, bill_date, items,
          sub_total, discount, grand_total, received, balance, amount_words,
          user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(b.estimateNo),
          b.customerName || "",
          b.customerPhone || "",
          billDate,
          itemsStr,
          toNum(b.subTotal),
          toNum(b.discount),
          toNum(b.grandTotal),
          toNum(b.received),
          toNum(b.balance),
          b.amountWords || "",
          userId
        ]
      );
      return res.json({ success: true, action: "inserted" });
    }
  } catch (err) {
    console.error("Save bill error:", err);
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

/**
 * Get all bills for the current user.
 * Frontend expects each record to include a `billData` STRING.
 */
app.get("/api/get-bills", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const [rows] = await db.query(
      "SELECT * FROM bills WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC",
      [userId]
    );

    const out = rows.map(r => ({
      ...r,
      billData: buildBillDataRow(r)
    }));
    res.json(out);
  } catch (err) {
    console.error("Error fetching bills:", err);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
});

/**
 * Get a single bill by estimate_no for the current user.
 */
app.get("/api/bills/:estimateNo", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { estimateNo } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM bills WHERE estimate_no = ? AND user_id = ? LIMIT 1",
      [String(estimateNo), userId]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: "Bill not found" });

    const bill = rows[0];
    bill.billData = buildBillDataRow(bill);
    res.json(bill);
  } catch (err) {
    console.error("Error fetching bill:", err);
    res.status(500).json({ error: "Failed to fetch bill" });
  }
});

/**
 * Partial update by estimateNo.
 * Body: { estimateNo, updates: { ...subset of bill fields... } }
 */
app.patch("/api/update-bill", requireAuth, async (req, res) => {
  const { estimateNo, updates } = req.body || {};
  if (!estimateNo || !updates) {
    return res.status(400).json({ success: false, message: "Missing estimateNo or updates" });
  }
  const userId = req.session.userId;

  try {
    const [rows] = await db.query(
      "SELECT * FROM bills WHERE estimate_no = ? AND user_id = ? LIMIT 1",
      [String(estimateNo), userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }
    const row = rows[0];

    const current = {
      estimateNo: row.estimate_no,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      billDate: row.bill_date,
      items: parseItems(row.items),
      subTotal: toNum(row.sub_total),
      discount: toNum(row.discount),
      grandTotal: toNum(row.grand_total),
      received: toNum(row.received),
      balance: toNum(row.balance),
      amountWords: row.amount_words || ""
    };

    const merged = { ...current, ...updates };

    await db.query(
      `UPDATE bills SET
         customer_name=?, customer_phone=?, bill_date=?, items=?,
         sub_total=?, discount=?, grand_total=?, received=?, balance=?, amount_words=?
       WHERE id=?`,
      [
        merged.customerName || "",
        merged.customerPhone || "",
        merged.billDate || null,
        toJSONString(merged.items),
        toNum(merged.subTotal),
        toNum(merged.discount),
        toNum(merged.grandTotal),
        toNum(merged.received),
        toNum(merged.balance),
        merged.amountWords || "",
        row.id
      ]
    );

    return res.json({ success: true, message: "Bill updated." });
  } catch (err) {
    console.error("Update bill error:", err);
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

/* ─────────────────────────────────────────────
   Soft delete — move to deleted_bills (history)
────────────────────────────────────────────── */
app.delete("/api/delete-bill", requireAuth, async (req, res) => {
  const { estimateNo } = req.body || {};
  if (!estimateNo) {
    return res.status(400).json({ success: false, message: "Missing estimateNo" });
  }
  const userId = req.session.userId;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM bills WHERE estimate_no = ? AND user_id = ? LIMIT 1",
      [String(estimateNo), userId]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Bill not found" });
    }
    const bill = rows[0];

    // 🔎 INSERT INTO deleted_bills happens right here (easy to find):
    await conn.query(
      `INSERT INTO deleted_bills
       (original_bill_id, estimate_no, customer_name, customer_phone, bill_date, items,
        sub_total, discount, grand_total, received, balance, amount_words, user_id, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        bill.id,
        bill.estimate_no,
        bill.customer_name,
        bill.customer_phone,
        bill.bill_date,
        // ensure items stored as JSON string (column type is JSON)
        toJSONString(bill.items),
        bill.sub_total,
        bill.discount,
        bill.grand_total,
        bill.received,
        bill.balance,
        bill.amount_words,
        userId
      ]
    );

    await conn.query("DELETE FROM bills WHERE id = ?", [bill.id]);

    await conn.commit();
    return res.json({ success: true, message: "Bill moved to deleted history." });
  } catch (err) {
    await conn.rollback();
    console.error("Soft delete error:", err);
    return res.status(500).json({ success: false, message: "Database error" });
  } finally {
    conn.release();
  }
});

/* ─────────────────────────────────────────────
   Deleted bills (history) — list / restore / purge
────────────────────────────────────────────── */
app.get("/api/get-deleted-bills", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const [rows] = await db.query(
      "SELECT * FROM deleted_bills WHERE user_id = ? ORDER BY deleted_at DESC",
      [userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("Get deleted bills error:", err);
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

app.post("/api/restore-bill", requireAuth, async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, message: "Missing id" });
  const userId = req.session.userId;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM deleted_bills WHERE id = ? AND user_id = ? LIMIT 1",
      [id, userId]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Deleted bill not found" });
    }
    const d = rows[0];

    await conn.query(
      `INSERT INTO bills
       (estimate_no, customer_name, customer_phone, bill_date, items,
        sub_total, discount, grand_total, received, balance, amount_words, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.estimate_no,
        d.customer_name,
        d.customer_phone,
        d.bill_date,
        // keep as-is (JSON column)
        toJSONString(d.items),
        d.sub_total,
        d.discount,
        d.grand_total,
        d.received,
        d.balance,
        d.amount_words,
        userId
      ]
    );

    await conn.query("DELETE FROM deleted_bills WHERE id = ?", [id]);

    await conn.commit();
    return res.json({ success: true, message: "Bill restored." });
  } catch (err) {
    await conn.rollback();
    console.error("Restore bill error:", err);
    return res.status(500).json({ success: false, message: "Database error" });
  } finally {
    conn.release();
  }
});

app.delete("/api/permanent-delete-bill", requireAuth, async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, message: "Missing id" });
  const userId = req.session.userId;

  try {
    const [result] = await db.query(
      "DELETE FROM deleted_bills WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    return res.json({ success: true, message: "Permanently deleted." });
  } catch (err) {
    console.error("Permanent delete error:", err);
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

/* ─────────────────────────────────────────────
   Root + DB bootstrap
────────────────────────────────────────────── */
app.get("/", (_req, res) => res.send("Billing System API is running 🚀"));

async function initDb() {
  // Make sure the history table exists (matches your DESC exactly)
  await db.query(`
    CREATE TABLE IF NOT EXISTS deleted_bills (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      original_bill_id INT NULL,
      estimate_no VARCHAR(50),
      customer_name VARCHAR(255),
      customer_phone VARCHAR(50),
      bill_date DATE NULL,
      items JSON NULL,
      sub_total DECIMAL(10,2) DEFAULT 0.00,
      discount DECIMAL(10,2) DEFAULT 0.00,
      grand_total DECIMAL(10,2) DEFAULT 0.00,
      received DECIMAL(10,2) DEFAULT 0.00,
      balance DECIMAL(10,2) DEFAULT 0.00,
      amount_words VARCHAR(255),
      user_id VARCHAR(100),
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.listen(PORT, async () => {
  try {
    const conn = await db.getConnection();
    conn.release();
    await initDb();
    console.log("✅ Database connection OK (and tables ready)");
  } catch (e) {
    console.error("❌ Database connection failed:", e.message);
  }
  console.log(`Server running at http://localhost:${PORT}`);
});
