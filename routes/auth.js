// BloodBond Backend - Auth routes (register + login)
// POST /api/auth/register  - new Donor / Acceptor account (Status = Pending, Admin approves)
// POST /api/auth/login     - email + password -> JWT token

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

const router = express.Router();

// Register a new user.
// Password is NEVER saved as plain text: bcrypt hash is saved in Users.PasswordHash.
// Role can only be Donor or Acceptor here (Admin is created by the system owner).
// After register the account is Pending - login works only after Admin approves.
router.post('/register', async (req, res) => {
  const { fullName, email, password, phone, role, occupation, division, district, upazila, bloodGroup, photo } = req.body;

  // Simple validation - empty or short input is rejected with a clear message.
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ message: 'Full name, email, password ar role lagbe.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password kom pokkhe 6 okkhor hote hobe.' });
  }
  if (!['Donor', 'Acceptor'].includes(role)) {
    return res.status(400).json({ message: 'Role Donor ba Acceptor hote hobe.' });
  }
  if (role === 'Donor' && !bloodGroup) {
    return res.status(400).json({ message: 'Donor hole blood group lagbe.' });
  }
  // Photo OPTIONAL - dile data URI + 500KB-er vitore hote hobe.
  const MAX_PHOTO_LENGTH = 500000;
  if (photo && (typeof photo !== 'string' || !photo.startsWith('data:image/') || photo.length > MAX_PHOTO_LENGTH)) {
    return res.status(400).json({ message: 'Chobi-ta thik na ba beshi boro. Choto chobi dao (JPG/PNG).' });
  }

  try {
    // bcrypt hash - the real password is never stored or returned.
    const passwordHash = await bcrypt.hash(password, 10);

    const pool = await getPool();
    const request = pool.request();
    request.input('FullName', sql.NVarChar(100), fullName);
    request.input('Email', sql.NVarChar(150), email);
    request.input('PasswordHash', sql.NVarChar(255), passwordHash);
    request.input('Phone', sql.NVarChar(20), phone || null);
    request.input('Role', sql.NVarChar(20), role);
    request.input('Occupation', sql.NVarChar(50), occupation || null);
    request.input('Division', sql.NVarChar(50), division || null);
    request.input('District', sql.NVarChar(100), district || null);
    request.input('Upazila', sql.NVarChar(100), upazila || null);
    request.input('BloodGroup', sql.NVarChar(3), bloodGroup || null);
    request.output('NewUserID', sql.Int);

    // sp_RegisterUser (Step 1, 03) creates the Users row and, for Donor,
    // also the Donors row. It returns the new UserID.
    const result = await request.execute('sp_RegisterUser');
    const newUserId = result.output.NewUserID;

    // Photo dile alada kore save koro (sp_RegisterUser-e photo-r field nai).
    if (photo) {
      await pool.request()
        .input('UserID', sql.Int, newUserId)
        .input('ProfilePhoto', sql.NVarChar(sql.MAX), photo)
        .query('UPDATE Users SET ProfilePhoto = @ProfilePhoto WHERE UserID = @UserID');
    }

    res.status(201).json({
      message: 'Register hoyeche. Admin approve korle login korte parba.',
      userId: newUserId,
    });
  } catch (err) {
    // 2627 / 2601 = duplicate email (Email is UNIQUE in Users table)
    if (err.number === 2627 || err.number === 2601) {
      return res.status(400).json({ message: 'Ei email diye agei register kora ache.' });
    }
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Register holo na. Abar try koro.' });
  }
});

// Login with email + password.
// Steps: find user by email -> compare password with saved hash -> check Approved
// -> give a JWT token (valid 1 day). The token is used on every protected route.
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email ar password lagbe.' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('Email', sql.NVarChar(150), email)
      .query('SELECT UserID, FullName, Email, PasswordHash, Role, Status, ProfilePhoto FROM Users WHERE Email = @Email');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Email ba password vul.' });
    }
    const user = result.recordset[0];

    // Demo seed users have the placeholder hash DEMO_HASH_CHANGE_IN_STEP2,
    // so they can NOT log in. Register a new user to test login.
    const ok = await bcrypt.compare(password, user.PasswordHash || '');
    if (!ok) {
      return res.status(401).json({ message: 'Email ba password vul.' });
    }
    if (user.Status !== 'Approved') {
      return res.status(403).json({ message: 'Admin ekhono approve koren ni. Approve hole login korte parba.' });
    }

    const token = jwt.sign(
      { userId: user.UserID, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Token-e chobi rakha hoy NA (token choto rakhte hoy) - chobi sudhu
    // response-er user object-e jay, frontend localStorage-e rakhbe.
    res.json({
      message: 'Login hoyeche.',
      token,
      user: { userId: user.UserID, fullName: user.FullName, email: user.Email, role: user.Role, profilePhoto: user.ProfilePhoto || null },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Login holo na. Abar try koro.' });
  }
});

module.exports = router;
