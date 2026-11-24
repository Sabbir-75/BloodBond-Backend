// BloodBond Backend - Blood stock routes
// GET /api/stock - stock by blood group (public, Home page e dekhano jabe)
// Proti group-e: bank-er bag (UnitsAvailable) + koyjon donor available.
// Purano seed/demo number ar nai - BloodStock 0 kora hoyeche (file 07).

const express = require('express');
const { getPool } = require('../config/db');

const router = express.Router();

// Stock list - mot bag (vw_TotalStockByGroup) + available donor count
// (vw_AvailableDonorsByGroup). Donor search-er eki niyom:
// sudhu Approved + Yes/NotSure donor-ra available.
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      'SELECT t.BloodGroup, t.UnitsAvailable, ISNULL(a.AvailableDonors, 0) AS AvailableDonors ' +
      'FROM vw_TotalStockByGroup t ' +
      'LEFT JOIN vw_AvailableDonorsByGroup a ON a.BloodGroup = t.BloodGroup ' +
      'ORDER BY t.BloodGroup'
    );
    res.json(result.recordset);
  } catch (err) {
    console.error('Stock error:', err.message);
    res.status(500).json({ message: 'Stock ana gelo na.' });
  }
});

module.exports = router;
