// BloodBond Backend - Admin routes
// GET /api/admin/dashboard      - counts for the admin dashboard
// GET /api/admin/users/pending  - users waiting for approval
// PUT /api/admin/users/:id/approve - approve a user (Donor/Acceptor)

const express = require('express');
const { getPool, sql } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes need: login + Admin role.
router.use(auth, requireRole('Admin'));

// Dashboard counts - simple COUNT queries, no password is ever returned.
router.get('/dashboard', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      'SELECT ' +
      '(SELECT COUNT(*) FROM Users WHERE Role = \'Donor\') AS TotalDonors, ' +
      '(SELECT COUNT(*) FROM Users WHERE Role = \'Acceptor\') AS TotalAcceptors, ' +
      '(SELECT COUNT(*) FROM Users WHERE Status = \'Pending\') AS PendingUsers, ' +
      '(SELECT COUNT(*) FROM BloodRequests WHERE Status = \'Pending\') AS PendingRequests, ' +
      '(SELECT COUNT(*) FROM Donations) AS TotalDonations, ' +
      '(SELECT SUM(UnitsAvailable) FROM BloodStock) AS TotalStockUnits'
    );
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ message: 'Dashboard ana gelo na.' });
  }
});

// Users waiting for approval - newest first. No password column here.
router.get('/users/pending', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      'SELECT UserID, FullName, Email, Phone, Role, Occupation, Division, District, Upazila, CreatedAt ' +
      'FROM Users WHERE Status = \'Pending\' ORDER BY CreatedAt DESC'
    );
    res.json(result.recordset);
  } catch (err) {
    console.error('Pending users error:', err.message);
    res.status(500).json({ message: 'Pending user ana gelo na.' });
  }
});

// Approve a user - sp_ApproveUser (Step 1, 03). After this the user can log in.
router.put('/users/:id/approve', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, Number(req.params.id))
      .execute('sp_ApproveUser');
    res.json({ message: 'User approve hoyeche.' });
  } catch (err) {
    console.error('Approve user error:', err.message);
    res.status(500).json({ message: 'Approve holo na.' });
  }
});

module.exports = router;
