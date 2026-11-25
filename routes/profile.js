// BloodBond Backend - My Profile routes (shob role-er jonno)
// GET  /api/profile/me           - nijer profile info + chobi (login lagbe)
// PUT  /api/profile/me           - nijer info bodlano (login lagbe, je kono role)
// PUT  /api/profile/me/photo     - nijer profile chobi bodlano (login lagbe)
// PUT  /api/profile/me/password  - nijer password bodlano (login lagbe)
// Role / Status ekhane bodlano jay NA - sudhu admin bodlate pare.
// Chobi base64 data URI hishebe Users.ProfilePhoto-te jome (file upload na).

const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Chobi-ta pathanor moto kina: data:image/... diye shuru + 500KB-er vitore.
// 500KB-er beshi hole database + token - dui jaygatei chap pore.
const MAX_PHOTO_LENGTH = 500000;
function photoOk(photo) {
  return typeof photo === 'string' && photo.startsWith('data:image/') && photo.length <= MAX_PHOTO_LENGTH;
}

// Nijer profile info - Donor / Acceptor / Admin, shobai.
// Donor-er blood group / status ekhane ashe na - ota /api/donors/me-te ache.
router.get('/me', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .query(
        'SELECT UserID, FullName, Email, Phone, Role, Occupation, Address, ' +
        'Division, District, Upazila, ProfilePhoto FROM Users WHERE UserID = @UserID'
      );
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Profile pai nai.' });
    }
    const u = result.recordset[0];
    res.json({
      userId: u.UserID,
      fullName: u.FullName,
      email: u.Email,
      phone: u.Phone,
      role: u.Role,
      occupation: u.Occupation,
      address: u.Address,
      division: u.Division,
      district: u.District,
      upazila: u.Upazila,
      profilePhoto: u.ProfilePhoto,
    });
  } catch (err) {
    console.error('Profile me error:', err.message);
    res.status(500).json({ message: 'Profile ana gelo na.' });
  }
});

// Nijer info bodlano - name, phone, address, occupation, location.
// Role / Status bodlano jay na ekhane (nijeke Admin banano jabe na).
// Email-o bodlano jay na - email holo login identity.
router.put('/me', auth, async (req, res) => {
  const { fullName, phone, address, occupation, division, district, upazila } = req.body;
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ message: 'Full name lagbe.' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .input('FullName', sql.NVarChar(100), fullName.trim())
      .input('Phone', sql.NVarChar(20), phone || null)
      .input('Address', sql.NVarChar(300), address || null)
      .input('Occupation', sql.NVarChar(50), occupation || null)
      .input('Division', sql.NVarChar(50), division || null)
      .input('District', sql.NVarChar(100), district || null)
      .input('Upazila', sql.NVarChar(100), upazila || null)
      .query(
        'UPDATE Users SET FullName = @FullName, Phone = @Phone, Address = @Address, ' +
        'Occupation = @Occupation, Division = @Division, District = @District, ' +
        'Upazila = @Upazila WHERE UserID = @UserID'
      );
    // Notun nam-ta frontend-ke ferot dao, jeno navbar-e sathe sathe bodle jay.
    const updated = await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .query('SELECT UserID, FullName, Email, Role, ProfilePhoto FROM Users WHERE UserID = @UserID');
    const u = updated.recordset[0];
    res.json({
      message: 'Profile update hoyeche.',
      user: { userId: u.UserID, fullName: u.FullName, email: u.Email, role: u.Role, profilePhoto: u.ProfilePhoto },
    });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ message: 'Profile update holo na.' });
  }
});

// Nijer profile chobi bodlano - body: { photo } (base64 data URI).
// Chobi-ta age frontend-e choto kora hoy (lib/photo.js, max 512px JPEG).
router.put('/me/photo', auth, async (req, res) => {
  const { photo } = req.body;
  if (!photoOk(photo)) {
    return res.status(400).json({ message: 'Chobi-ta thik na ba beshi boro. Choto chobi dao (JPG/PNG).' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .input('ProfilePhoto', sql.NVarChar(sql.MAX), photo)
      .query('UPDATE Users SET ProfilePhoto = @ProfilePhoto WHERE UserID = @UserID');
    res.json({ message: 'Profile photo update hoyeche.', profilePhoto: photo });
  } catch (err) {
    console.error('Profile photo error:', err.message);
    res.status(500).json({ message: 'Photo update holo na.' });
  }
});

// Nijer password bodlano - body: { currentPassword, newPassword }.
// Purono password na mille bodlabe na (onno kew bodlate parbe na).
router.put('/me/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Purono ar notun - dui password-i lagbe.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Notun password kom pokkhe 6 okkhor hote hobe.' });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .query('SELECT PasswordHash FROM Users WHERE UserID = @UserID');
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Profile pai nai.' });
    }
    const ok = await bcrypt.compare(currentPassword, result.recordset[0].PasswordHash || '');
    if (!ok) {
      return res.status(400).json({ message: 'Purono password vul.' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input('UserID', sql.Int, req.user.userId)
      .input('PasswordHash', sql.NVarChar(255), newHash)
      .query('UPDATE Users SET PasswordHash = @PasswordHash WHERE UserID = @UserID');
    res.json({ message: 'Password bodle geche.' });
  } catch (err) {
    console.error('Password change error:', err.message);
    res.status(500).json({ message: 'Password bodlano gelo na.' });
  }
});

module.exports = router;
