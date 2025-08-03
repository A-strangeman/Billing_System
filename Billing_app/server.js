import express from "express";
import session from "express-session";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import fs from "fs"; // Import the file system module

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 4000;
const BILLS_FILE_PATH = path.join(__dirname, 'bills.json');

// Middlewares
app.use(cors());
app.use(express.json());

// Setup session (stored in memory for now)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 15 }, // 15 min session
  })
);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// --- Helper function to read bills from the JSON file ---
const readBillsFromFile = () => {
    try {
        const data = fs.readFileSync(BILLS_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading bills file, returning empty array:", error);
        return [];
    }
};

// --- Helper function to write bills to the JSON file ---
const writeBillsToFile = (billsArray) => {
    try {
        fs.writeFileSync(BILLS_FILE_PATH, JSON.stringify(billsArray, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing bills to file:", error);
    }
};

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
    // Store the user ID in the session
    req.session.userId = 'admin'; // Using a static ID for the single admin user
    return res.json({ success: true, userId: 'admin' });
  } else {
    return res
      .status(401)
      .json({ success: false, message: "Invalid email or password" });
  }
});

// A simple middleware to protect routes
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

// API endpoint to save a new bill (from make_bill.html)
app.post('/api/save-bill', requireAuth, (req, res) => {
    const billData = req.body;
    const allBills = readBillsFromFile();

    const existingBillIndex = allBills.findIndex(b => 
        b.estimateNo === billData.estimateNo && b.userId === billData.userId
    );

    if (existingBillIndex > -1) {
        // If the bill exists, update it
        allBills[existingBillIndex] = billData;
    } else {
        // If it's a new bill, add it to the array
        allBills.push(billData);
    }

    writeBillsToFile(allBills);
    res.status(200).json({ success: true, message: 'Bill saved successfully.' });
});

// API endpoint to get all bills for the logged-in user
app.get('/api/get-bills', requireAuth, (req, res) => {
    const userId = req.query.userId;
    if (!userId || userId !== req.session.userId) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const allBills = readBillsFromFile();
    const userBills = allBills.filter(bill => bill.userId === userId);
    res.status(200).json(userBills);
});

// Logout Route
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});