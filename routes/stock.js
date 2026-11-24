// BloodBond Backend - Blood stock routes
// GET /api/stock - stock by blood group (public, Home page e dekhano jabe)
// Mot stock = donation-er stock (BloodStock) + blood bank-er stock.
// Dashboard theke random +/- update ar nai - stock bodlay sudhu
// donation, issue, ar blood bank entry diye.

const express = require('express');
const { getPool } = require('../config/db');

const router = express.Router();

// Stock list - uses the view vw_TotalStockByGroup (Step 1, 06).
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM vw_TotalStockByGroup ORDER BY BloodGroup');
    res.json(result.recordset);
  } catch (err) {
    console.error('Stock error:', err.message);
    res.status(500).json({ message: 'Stock ana gelo na.' });
  }
});

module.exports = router;
