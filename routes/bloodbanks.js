// BloodBond Backend - Blood Bank routes
// GET  /api/bloodbanks        - login lagbe: bank list, sudhu je bank-e bag ache
// GET  /api/bloodbanks/admin  - Admin only: shob bank, shob group (0 bag shoho)
// POST /api/bloodbanks        - Admin only: notun bank add koro
// PUT  /api/bloodbanks/:id    - Admin only: bank-er info bodlao
// PUT  /api/bloodbanks/:id/stock - Admin only: bank-er ekta group-er bag count SET koro

const express = require('express');
const { getPool, sql } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// View-er row gulo bank onujai sajano:
// [{ bankId, bankName, email, phone, division, district, upazila, address, stock: [{bloodGroup, units}] }]
// Bank-er kono stock row na thakle stock: [] hobe.
function groupBanks(rows) {
  const byId = new Map();
  for (const r of rows) {
    if (!byId.has(r.BankID)) {
      byId.set(r.BankID, {
        bankId: r.BankID,
        bankName: r.BankName,
        email: r.Email,
        phone: r.Phone,
        division: r.Division,
        district: r.District,
        upazila: r.Upazila,
        address: r.Address,
        stock: [],
      });
    }
    if (r.BloodGroup) {
      byId.get(r.BankID).stock.push({ bloodGroup: r.BloodGroup, units: r.UnitsAvailable });
    }
  }
  return [...byId.values()];
}

// Bank list - login MUST. Sudhu je bank-e ontoto 1 bag ache, sei bank asbe.
router.get('/', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      'SELECT * FROM vw_BloodBanksWithStock WHERE UnitsAvailable > 0 ORDER BY BankName, BloodGroup'
    );
    res.json(groupBanks(result.recordset));
  } catch (err) {
    console.error('Blood banks error:', err.message);
    res.status(500).json({ message: 'Blood bank list ana gelo na.' });
  }
});

// Admin bank list - shob bank, shob group (0 bag shoho). Edit korar jonno.
router.get('/admin', auth, requireRole('Admin'), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      'SELECT * FROM vw_BloodBanksWithStock ORDER BY BankName, BloodGroup'
    );
    res.json(groupBanks(result.recordset));
  } catch (err) {
    console.error('Admin blood banks error:', err.message);
    res.status(500).json({ message: 'Blood bank list ana gelo na.' });
  }
});

// Notun bank add koro - Admin only. Bank + tar ekta group-er bag - ek sathe.
router.post('/', auth, requireRole('Admin'), async (req, res) => {
  const { bankName, email, phone, division, district, upazila, address, bloodGroup, units } = req.body;
  if (!bankName || !bankName.trim()) {
    return res.status(400).json({ message: 'Bank name lagbe.' });
  }
  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    return res.status(400).json({ message: 'Blood group thik na.' });
  }
  const unitsNum = Number(units);
  if (!Number.isInteger(unitsNum) || unitsNum < 0) {
    return res.status(400).json({ message: 'Units 0 ba tar beshi hote hobe.' });
  }
  try {
    const pool = await getPool();
    // Eki phone number-er bank age theke thakle duibar add hobe na.
    if (phone && phone.trim()) {
      const dup = await pool.request()
        .input('Phone', sql.NVarChar(20), phone.trim())
        .query('SELECT BankID FROM BloodBanks WHERE Phone = @Phone AND Phone IS NOT NULL AND Phone <> \'\'');
      if (dup.recordset.length > 0) {
        return res.status(400).json({ message: 'Ei phone number-er bank age theke ache.' });
      }
    }
    // sp_AddBloodBank (Step 1, 06) - bank + stock, transaction-er vitore.
    const result = await pool.request()
      .input('BankName', sql.NVarChar(100), bankName.trim())
      .input('Email', sql.NVarChar(100), email || null)
      .input('Phone', sql.NVarChar(20), phone || null)
      .input('Division', sql.NVarChar(50), division || null)
      .input('District', sql.NVarChar(100), district || null)
      .input('Upazila', sql.NVarChar(100), upazila || null)
      .input('Address', sql.NVarChar(200), address || null)
      .input('BloodGroup', sql.NVarChar(3), bloodGroup)
      .input('Units', sql.Int, unitsNum)
      .execute('sp_AddBloodBank');
    res.json({ message: 'Blood bank add hoyeche.', bankId: result.recordset[0].BankID });
  } catch (err) {
    console.error('Add blood bank error:', err.message);
    res.status(400).json({ message: err.message || 'Blood bank add holo na.' });
  }
});

// Bank-er info bodlao - Admin only. Stock ekhane bodlay na.
router.put('/:id', auth, requireRole('Admin'), async (req, res) => {
  const { bankName, email, phone, division, district, upazila, address } = req.body;
  if (!bankName || !bankName.trim()) {
    return res.status(400).json({ message: 'Bank name lagbe.' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('BankID', sql.Int, Number(req.params.id))
      .input('BankName', sql.NVarChar(100), bankName.trim())
      .input('Email', sql.NVarChar(100), email || null)
      .input('Phone', sql.NVarChar(20), phone || null)
      .input('Division', sql.NVarChar(50), division || null)
      .input('District', sql.NVarChar(100), district || null)
      .input('Upazila', sql.NVarChar(100), upazila || null)
      .input('Address', sql.NVarChar(200), address || null)
      .execute('sp_UpdateBloodBank');
    res.json({ message: 'Blood bank update hoyeche.' });
  } catch (err) {
    console.error('Update blood bank error:', err.message);
    res.status(500).json({ message: 'Blood bank update holo na.' });
  }
});

// Bank-er ekta group-er bag count SET koro - Admin only.
// Units = oi bank-e oi group-er ekhon mot koy bag ache (jog na, notun sonkha).
router.put('/:id/stock', auth, requireRole('Admin'), async (req, res) => {
  const { bloodGroup, units } = req.body;
  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    return res.status(400).json({ message: 'Blood group thik na.' });
  }
  const unitsNum = Number(units);
  if (!Number.isInteger(unitsNum) || unitsNum < 0) {
    return res.status(400).json({ message: 'Units 0 ba tar beshi hote hobe.' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('BankID', sql.Int, Number(req.params.id))
      .input('BloodGroup', sql.NVarChar(3), bloodGroup)
      .input('Units', sql.Int, unitsNum)
      .execute('sp_SetBloodBankStock');
    res.json({ message: 'Stock update hoyeche.' });
  } catch (err) {
    console.error('Blood bank stock error:', err.message);
    res.status(500).json({ message: 'Stock update holo na.' });
  }
});

module.exports = router;
