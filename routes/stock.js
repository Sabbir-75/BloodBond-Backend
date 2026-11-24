// BloodBond Backend - Blood stock routes
// GET /api/stock - stock by blood group (public, Home page e dekhano jabe)
// PUT /api/stock - stock barano/komano (Admin only)

const express = require('express');
const { getPool, sql } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Stock list - uses the view vw_BloodStockByGroup (Step 1, 02).
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM vw_BloodStockByGroup ORDER BY BloodGroup');
    res.json(result.recordset);
  } catch (err) {
    console.error('Stock error:', err.message);
    res.status(500).json({ message: 'Stock ana gelo na.' });
  }
});

// Update stock - Admin only. UnitsChange can be + (jog) or - (biyog).
// sp_UpdateBloodStock (Step 1, 03) runs in a transaction and never lets stock go below 0.
router.put('/', auth, requireRole('Admin'), async (req, res) => {
  const { bloodGroup, unitsChange } = req.body;
  if (!bloodGroup || unitsChange === undefined) {
    return res.status(400).json({ message: 'Blood group ar unitsChange lagbe.' });
  }
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('BloodGroup', sql.NVarChar(3), bloodGroup);
    request.input('UnitsChange', sql.Int, Number(unitsChange));
    request.output('NewUnits', sql.Int);
    const result = await request.execute('sp_UpdateBloodStock');
    res.json({ message: 'Stock update hoyeche.', bloodGroup, newUnits: result.output.NewUnits });
  } catch (err) {
    console.error('Update stock error:', err.message);
    res.status(400).json({ message: err.message || 'Stock update holo na.' });
  }
});

module.exports = router;
