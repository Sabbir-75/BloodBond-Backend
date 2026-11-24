// BloodBond Backend - Blood request routes
// POST /api/requests            - Acceptor creates a blood request
// GET  /api/requests/mine      - my own requests (Acceptor login)
// GET  /api/requests/pending   - pending requests list (Admin login)
// PUT  /api/requests/:id/approve            - Admin approves a request
// PUT  /api/requests/:id/fulfil-from-stock - Admin gives blood from stock (transaction in DB)

const express = require('express');
const { getPool, sql } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Create a blood request - Acceptor login. AcceptorID comes from the token,
// never from the request body (so nobody can request as someone else).
router.post('/', auth, requireRole('Acceptor'), async (req, res) => {
  const { bloodGroup, unitsNeeded, urgency, division, district, upazila, hospitalName, neededByDate } = req.body;
  if (!bloodGroup || !unitsNeeded || !division || !district || !upazila) {
    return res.status(400).json({ message: 'Blood group, bag, division, district, upazila lagbe.' });
  }
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('AcceptorID', sql.Int, req.user.userId);
    request.input('BloodGroup', sql.NVarChar(3), bloodGroup);
    request.input('UnitsNeeded', sql.Int, Number(unitsNeeded));
    request.input('Urgency', sql.NVarChar(20), urgency || 'Medium');
    request.input('Division', sql.NVarChar(50), division);
    request.input('District', sql.NVarChar(100), district);
    request.input('Upazila', sql.NVarChar(100), upazila);
    request.input('HospitalName', sql.NVarChar(150), hospitalName || null);
    request.input('NeededByDate', sql.Date, neededByDate || null);
    request.output('NewRequestID', sql.Int);
    // sp_CreateBloodRequest (Step 1, 03)
    const result = await request.execute('sp_CreateBloodRequest');
    res.status(201).json({ message: 'Request pathano hoyeche.', requestId: result.output.NewRequestID });
  } catch (err) {
    console.error('Create request error:', err.message);
    res.status(500).json({ message: 'Request pathano gelo na.' });
  }
});

// My own requests - newest first.
router.get('/mine', auth, requireRole('Acceptor'), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('AcceptorID', sql.Int, req.user.userId)
      .query('SELECT * FROM BloodRequests WHERE AcceptorID = @AcceptorID ORDER BY CreatedAt DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error('My requests error:', err.message);
    res.status(500).json({ message: 'Request list ana gelo na.' });
  }
});

// Pending requests - Admin only. Uses the view vw_PendingRequests (Step 1, 02).
router.get('/pending', auth, requireRole('Admin'), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM vw_PendingRequests ORDER BY CreatedAt DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error('Pending requests error:', err.message);
    res.status(500).json({ message: 'Pending request ana gelo na.' });
  }
});

// Approve a request - Admin only. sp_ApproveRequest (Step 1, 03).
router.put('/:id/approve', auth, requireRole('Admin'), async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('RequestID', sql.Int, Number(req.params.id))
      .execute('sp_ApproveRequest');
    res.json({ message: 'Request approve hoyeche.' });
  } catch (err) {
    console.error('Approve request error:', err.message);
    res.status(500).json({ message: 'Approve holo na.' });
  }
});

// Give blood from stock for a request - Admin only.
// sp_IssueBloodFromStock (Step 1, 03) runs in a transaction:
// stock kombe + request Fulfilled hobe - stock na thakle kichui bodlabe na.
router.put('/:id/fulfil-from-stock', auth, requireRole('Admin'), async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('RequestID', sql.Int, Number(req.params.id))
      .execute('sp_IssueBloodFromStock');
    res.json({ message: 'Stock theke blood dewa hoyeche.' });
  } catch (err) {
    console.error('Fulfil request error:', err.message);
    // Insufficient stock comes back as a SQL error - show it plainly.
    res.status(400).json({ message: err.message || 'Stock theke dewa gelo na.' });
  }
});

module.exports = router;
