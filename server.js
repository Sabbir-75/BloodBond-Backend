// BloodBond Backend - main server file
// Start:  node server.js   (from the backend folder, after npm install + .env)
// Then:   http://localhost:5000/api/health  should say { "status": "ok" }

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { getPool } = require('./config/db');

// Route files - each file handles one part of the API.
const authRoutes = require('./routes/auth');
const donorRoutes = require('./routes/donors');
const requestRoutes = require('./routes/requests');
const stockRoutes = require('./routes/stock');
const adminRoutes = require('./routes/admin');
const bloodBankRoutes = require('./routes/bloodbanks');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - every request goes through these first.
// cors() = frontend (Step 3, localhost:3000) can call this API.
// express.json() = read JSON bodies from POST/PUT requests.
app.use(cors());
app.use(express.json());

// Health check - quick test that the server is running (no login needed).
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BloodBond API cholche.' });
});

// API routes - each group has its own URL start.
app.use('/api/auth', authRoutes);       // register, login
app.use('/api/donors', donorRoutes);    // available donors, contact, my status
app.use('/api/requests', requestRoutes); // blood requests
app.use('/api/stock', stockRoutes);     // blood stock
app.use('/api/admin', adminRoutes);     // admin dashboard + approve user
app.use('/api/bloodbanks', bloodBankRoutes); // blood banks (login lagbe)

// Unknown URL - clear 404 message instead of an HTML page.
app.use((req, res) => {
  res.status(404).json({ message: 'Ei URL ta API te nai.' });
});

// Start the server. First connect to the database, then listen.
// If the DB connection fails, the error is shown and the server does not start.
async function start() {
  try {
    await getPool();
    app.listen(PORT, () => {
      console.log('BloodBond API cholche: http://localhost:' + PORT);
      console.log('Health check: http://localhost:' + PORT + '/api/health');
    });
  } catch (err) {
    console.error('Database connect holo na:', err.message);
    console.error('Check koro: SQL Server cholche kina, .env er DB_USER / DB_PASSWORD thik kina.');
    process.exit(1);
  }
}

start();
