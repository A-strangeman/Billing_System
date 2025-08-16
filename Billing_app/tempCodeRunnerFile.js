// server.js
import express from "express";
import session from "express-session";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from Billing_app/.env
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 4000;

/* ---------------------------------------------
   MySQL pool
---------------------------------------------- */
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "billing_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* ---------------------------------------------
   Middleware
---------------------------------------------- */
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 30 // 30 minutes
  }
}));

// Serve static files (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, "public")));

/* ---------------------------------------------
   Helpers
---------------------------------------------- */
const requireAuth = (req, res, next) => {
  if (req.session?.userId) return next();
  return res.status(401).json({ success: false, message: "Unauthorized" });
};

// Parse items safely from DB (can be JSON column or string or object)
function parseItems(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "object") return val; // MySQL JSON may already be an object
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

// Build the billData **string** that your frontend expects to parse
function buildBillDataRow(row) {
  const billObj = {
    estimateNo: row.estimate_no ?? row.estimateNo ?? "",
    customerName: row.customer_name ?? row.customerName ?? "",
    customerPhone: row.customer_phone ?? row.customerPhone ?? "",
    billDate: row.bill_date ?? row.billDate ?? null,
    items: parseItems(row.items),
    subTotal: Number(row.sub_total ?? 0),
    discount: Number(row.discount ?? 0),
    grandTotal: Number(row.grand_total ?? 0),
    received: Number(row.received ?? 0),
    balance: Number(row.balance ?? 0),
    amountWords: row.amount_words ?? ""
  };
  return JSON.stringify(billObj);
}

/* ---------------------------------------------
   Auth
---------------------------------------------- */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  const expectedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const expectedPassword = (process.env.ADMIN_PASSWORD || "").trim();

  if (
    email &&
    password &&
    email.trim().toLowerCase() === expectedEmail &&
    password === expectedPassword
  ) {
    // single admin user
    req.session.userId = "admin";
    return res.json({ success: true, userId: "admin" });
  }
  return res.status(401).json({ success: false, message: "Invalid email or password" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

/* ---------------------------------------------
   Bills (active)
---------------------------------------------- */

// Create/Update bill (UPSERT by estimate_no + user)
app.post("/api/save-bill", requireAuth, async (req, res) => {
  const b = req.body || {};
  const user = req.session.userId;

  // Basic validation
  if (!b.estimateNo || !b.customerName) {
    return res.status(400).json({ success: false, message: "Missing estimateNo or customerName" });
  }

  // Normalize values for DB
  const items = Array.isArray(b.items) ? JSON.stringify(b.items) : JSON.stringify([]);
  const bill_date = b.billDate ? new Date(b.billDate) : null;

  const params = {
    estimate_no: String(b.estimateNo),
    customer_name: b.customerName || "",
    customer_phone: b.customerPhone || "",
    bill_date,
    items,
    sub_total: Number(b.subTotal || 0),
    discount: Number(b.discount || 0),
    grand_total: Number(b.grandTotal || 0),
    received: Number(b.received || 0),
    balance: Number(b.balance || 0),
    amount_words: b.amountWords || "",
    user_id: user,
    // Write both due to your schema (userId NOT NULL exists)
    userId: user
  };

  try {
    // Does a bill with this estimate_no exist for this user?
    const [existing] = await db.query(
      "SELECT id FROM bills WHERE estimate_no = ? AND (user_id = ? OR userId = ?)",
      [params.estimate_no, user, user]
    );

    if (existing.length > 0) {
      // Update
      await db.query(
        `UPDATE bills
         SET customer_name=?, customer_phone=?, bill_date=?, items=?, sub_total=?, discount=?, grand_total=?, received=?, balance=?, amount_words=?, user_id=?, userId=?, updated_at=NOW(), updatedAt=NOW()
         WHERE id=?`,
        [
          params.customer_name, params.customer_phone, params.bill_date, params.items,
          params.sub_total, params.discount, params.grand_total, params.received,
          params.balance, params.amount_words, params.user_id, params.userId,
          existing[0].id
        ]
      );
    } else {
      // Insert (provide both snake & camel for your table)
      await db.query(
        `INSERT INTO bills
         (estimate_no, customer_name, customer_phone, bill_date, items, sub_total, discount, grand_total, received, balance, amount_words, user_id, userId, created_at, updated_at, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [
          params.estimate_no, params.customer_name, params.customer_phone, params.bill_date,
          params.items, params.sub_total, params.discount, params.grand_total,
          params.received, params.balance, params.amount_words, params.user_id, params.userId
        ]
      );
    }

    return res.json({ success: true, message: "Bill saved." });
  } catch (err) {
    console.error("Save bill error:", err);
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

// Get bills (frontend expects record.billData as a STRING)
app.get("/api/get-bills", requireAuth, async (req, res) => {
  try {
    const user = req.session.userId;
    const [rows] = await db.query(
      `SELECT *
         FROM bills
        WHERE (user_id = ? OR userId = ?)
        ORDER BY updated_at DESC, updatedAt DESC, created_at DESC`,
      [user, user]
    );

    const records = rows.map(row => ({
      id: row.id,
      estimate_no: row.estimate_no,
      customer_name: row.customer_name,
      // The key line: provide billData **as a JSON string**
      billData: buildBillDataRow(row)
    }));

    return res.json(records);
  } catch (err) {
    console.error("Get bills error:", err);
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

// Partial update (patch) by estimateNo
app.patch("/api/update-bill", requireAuth, async (req, res) => {
  const { estimateNo, updates } = req.body || {};
  if (!estimateNo || !updates) {
    return res.status(400).json({ success: false, message: "Missing estimateNo or updates" });
  }
  const user = req.session.userId;

  try {
    const [rows] = await db.query(
      "SELECT * FROM bills WHERE estimate_no = ? AND (user_id = ? OR userId = ?) LIMIT 1",
      [String(estimateNo), user, user]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }
    const row = rows[0];

    // Build current bill object
    const current = {
      estimateNo: row.estimate_no,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      billDate: row.bill_date,
      items: parseItems(row.items),
      subTotal: Number(row.sub_total || 0),
      discount: Number(row.discount || 0),
      grandTotal: Number(row.grand_total || 0),
      received: Number(row.received || 0),
      balance: Number(row.balance || 0),
      amountWords: row.amount_words || ""
    };

    const merged = { ...current, ...updates };

    await db.query(
      `UPDATE bills SET
         customer_name=?, customer_phone=?, bill_date=?, items=?,
         sub_total=?, discount=?, grand_total=?, received=?, balance=?, amount_words=?,
         updated_at=NOW(), updatedAt=NOW()
       WHERE id=?`,
      [
        merged.customerName || "",
        merged.customerPhone || "",
        merged.billDate || null,
        JSON.stringify(merged.items || []),
        Number(merged.subTotal || 0),
        Number(merged.discount || 0),
        Number(merged.grandTotal || 0),
        Number(merged.received || 0),
        Number(merged.balance || 0),
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

/* ---------------------------------------------
   Soft delete: move to deleted_bills
---------------------------------------------- */
app.delete("/api/delete-bill", requireAuth, async (req, res) => {
  const { estimateNo } = req.body || {};
  if (!estimateNo) {
    return res.status(400).json({ success: false, message: "Missing estimateNo" });
  }
  const user = req.session.userId;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM bills WHERE estimate_no = ? AND (user_id = ? OR userId = ?) LIMIT 1",
      [String(estimateNo), user, user]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Bill not found" });
    }
    const bill = rows[0];

    // Insert into deleted_bills
    await conn.query(
      `INSERT INTO deleted_bills
       (original_bill_id, estimate_no, customer_name, customer_phone, bill_date, items,
        sub_total, discount, grand_total, received, balance, amount_words, user_id, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        bill.id, bill.estimate_no, bill.customer_name, bill.customer_phone, bill.bill_date,
        bill.items, bill.sub_total, bill.discount, bill.grand_total, bill.received,
        bill.balance, bill.amount_words, user
      ]
    );

    // Delete from active bills
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

/* ---------------------------------------------
   Deleted bills (history)
---------------------------------------------- */
// List deleted bills
app.get("/api/get-deleted-bills", requireAuth, async (req, res) => {
  try {
    const user = req.session.userId;
    const [rows] = await db.query(
      "SELECT * FROM deleted_bills WHERE user_id = ? ORDER BY deleted_at DESC",
      [user]
    );
    return res.json(rows);
  } catch (err) {
    console.error("Get deleted bills error:", err);
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

// Restore bill from deleted_bills back to bills
app.post("/api/restore-bill", requireAuth, async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, message: "Missing id" });
  const user = req.session.userId;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM deleted_bills WHERE id = ? AND user_id = ? LIMIT 1",
      [id, user]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Deleted bill not found" });
    }
    const d = rows[0];

    // Insert back to bills (write user_id and userId)
    await conn.query(
      `INSERT INTO bills
       (estimate_no, customer_name, customer_phone, bill_date, items, sub_total, discount, grand_total, received, balance, amount_words, user_id, userId, created_at, updated_at, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [
        d.estimate_no, d.customer_name, d.customer_phone, d.bill_date, d.items,
        d.sub_total, d.discount, d.grand_total, d.received, d.balance, d.amount_words,
        user, user
      ]
    );

    // Remove from deleted_bills
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

// Permanent delete from deleted_bills
app.delete("/api/permanent-delete-bill", requireAuth, async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, message: "Missing id" });
  const user = req.session.userId;

  try {
    const [result] = await db.query(
      "DELETE FROM deleted_bills WHERE id = ? AND user_id = ?",
      [id, user]
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



/* ---------------------------------------------
   Start
---------------------------------------------- */
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
