import express from "express";
import session from "express-session";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Setup session (stored in memory for now)
app.use(
  session({
    secret: "supersecretkey", // Change to something unique
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 15 }, // 15 min session
  })
);

app.use(express.static(path.join(__dirname, "public")));

// Login Route
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  const expectedEmail = (process.env.ADMIN_EMAIL || "").trim();
  const expectedPassword = (process.env.ADMIN_PASSWORD || "").trim();

  if (
    email &&
    password &&
    email.toLowerCase() === expectedEmail.toLowerCase() &&
    password === expectedPassword
  ) {
    req.session.isAuthenticated = true;
    return res.json({ success: true });
  } else {
    return res
      .status(401)
      .json({ success: false, message: "Invalid email or password" });
  }
});

// Check Auth (for welcome page)
app.get("/api/check-auth", (req, res) => {
  if (req.session.isAuthenticated) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// Logout Route
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
