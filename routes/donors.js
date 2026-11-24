// BloodBond Backend - Donor routes
// GET  /api/donors/available         - public list (NO phone/email - login lagbe)
// GET  /api/donors/:id/contact      - login lagle phone/email (tel: / mailto er jonno)
// GET  /api/donors/me               - nijer donor profile (Donor login)
// PUT  /api/donors/status           - nijer status bodlano Yes/No/NotSure (Donor login)

const express = require('express');
const { getPool, sql } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Available donors list - search by blood group / division / district / upazila.
// Empty filter = no filter (all available donors).
// Phone/email is REMOVED here on purpose: contact dekhte login lagbe (Step 3 rule).
router.get('/available', async (req, res) => {
  const { bloodGroup, division, district, upazila } = req.query;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('BloodGroup', sql.NVarChar(3), bloodGroup || null)
      .input('Division', sql.NVarChar(50), division || null)
      .input('District', sql.NVarChar(100), district || null)
      .input('Upazila', sql.NVarChar(100), upazila || null)
      // sp_SearchDonors (Step 1, 03) uses tf_SearchDonors - Yes + NotSure donors only.
      .execute('sp_SearchDonors');

    // Keep only the safe fields for the public list.
    const donors = result.recordset.map((d) => ({
      donorId: d.DonorID,
      fullName: d.FullName,
      bloodGroup: d.BloodGroup,
      occupation: d.Occupation,
      division: d.Division,
      district: d.District,
      upazila: d.Upazila,
      availabilityStatus: d.AvailabilityStatus,
      nextEligibleDate: d.NextEligibleDate,
      isEligible: d.IsEligible,
    }));
    res.json(donors);
  } catch (err) {
    console.error('Available donors error:', err.message);
    res.status(500).json({ message: 'Donor list ana gelo na.' });
  }
});

// Donor contact (phone + email) - login MUST. Frontend e tel: / mailto: button
// ei data diye banabe.
router.get('/:id/contact', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('DonorID', sql.Int, Number(req.params.id))
      .query(
        'SELECT u.FullName, u.Phone, u.Email FROM Users u ' +
        'JOIN Donors d ON d.DonorID = u.UserID WHERE d.DonorID = @DonorID'
      );
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Donor pai nai.' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Donor contact error:', err.message);
    res.status(500).json({ message: 'Contact ana gelo na.' });
  }
});

// My own donor profile - Donor login, with next eligible date (90-day rule).
router.get('/me', auth, requireRole('Donor'), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('DonorID', sql.Int, req.user.userId)
      .query(
        'SELECT u.FullName, u.Email, u.Phone, u.Occupation, u.Division, u.District, u.Upazila, ' +
        'd.BloodGroup, d.LastDonationDate, d.AvailabilityStatus, ' +
        'dbo.fn_GetNextEligibleDate(d.DonorID) AS NextEligibleDate, ' +
        'dbo.fn_IsDonorEligible(d.DonorID) AS IsEligible ' +
        'FROM Users u JOIN Donors d ON d.DonorID = u.UserID WHERE d.DonorID = @DonorID'
      );
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Donor profile pai nai.' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Donor me error:', err.message);
    res.status(500).json({ message: 'Profile ana gelo na.' });
  }
});

// Update my own profile details (name, phone, occupation, address).
// Blood group + email are NOT editable here: blood group is the medical
// identity and email is the login identity. Donor can only change own row.
router.put('/me', auth, requireRole('Donor'), async (req, res) => {
  const { fullName, phone, occupation, division, district, upazila } = req.body;
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ message: 'Full name lagbe.' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .input('FullName', sql.NVarChar(100), fullName.trim())
      .input('Phone', sql.NVarChar(20), phone || null)
      .input('Occupation', sql.NVarChar(50), occupation || null)
      .input('Division', sql.NVarChar(50), division || null)
      .input('District', sql.NVarChar(100), district || null)
      .input('Upazila', sql.NVarChar(100), upazila || null)
      .query(
        'UPDATE Users SET FullName = @FullName, Phone = @Phone, Occupation = @Occupation, ' +
        'Division = @Division, District = @District, Upazila = @Upazila WHERE UserID = @UserID'
      );
    res.json({ message: 'Profile update hoyeche.' });
  } catch (err) {
    console.error('Donor profile update error:', err.message);
    res.status(500).json({ message: 'Profile update holo na.' });
  }
});

// Update my own status - Yes / No / NotSure + last donation date.
// After donation: status No + date. 90 din por fn_IsDonorEligible auto Yes kore.
router.put('/status', auth, requireRole('Donor'), async (req, res) => {
  const { availabilityStatus, lastDonationDate } = req.body;
  if (!['Yes', 'No', 'NotSure'].includes(availabilityStatus)) {
    return res.status(400).json({ message: 'Status Yes, No ba NotSure hote hobe.' });
  }
  try {
    const pool = await getPool();
    // sp_UpdateDonorStatus (Step 1, 03) - DonorID = token er userId (nijer ta).
    await pool.request()
      .input('DonorID', sql.Int, req.user.userId)
      .input('AvailabilityStatus', sql.NVarChar(10), availabilityStatus)
      .input('LastDonationDate', sql.Date, lastDonationDate || null)
      .execute('sp_UpdateDonorStatus');
    res.json({ message: 'Status update hoyeche.' });
  } catch (err) {
    console.error('Donor status error:', err.message);
    res.status(500).json({ message: 'Status update holo na.' });
  }
});

module.exports = router;
