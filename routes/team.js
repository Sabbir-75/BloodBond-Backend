// BloodBond Backend - Team Member routes (Home page-er "Meet Our Team")
// GET    /api/team      - public: shob member, SortOrder onujai
// POST   /api/team      - Admin only: notun member add koro
// PUT    /api/team/:id  - Admin only: member-er info bodlao
// DELETE /api/team/:id  - Admin only: member delete koro
// Chobi base64 data URI hishebe TeamMembers.Photo-te jome (file upload na).

const express = require('express');
const { getPool, sql } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Chobi-ta pathanor moto kina: data:image/... diye shuru + 500KB-er vitore.
const MAX_PHOTO_LENGTH = 500000;
function photoOk(photo) {
  return photo === null || photo === undefined || photo === '' ||
    (typeof photo === 'string' && photo.startsWith('data:image/') && photo.length <= MAX_PHOTO_LENGTH);
}

// Ekta row-ke frontend-er moto sajao (camelCase).
function mapMember(r) {
  return {
    memberId: r.MemberID,
    fullName: r.FullName,
    address: r.Address,
    university: r.University,
    department: r.Department,
    photo: r.Photo,
    sortOrder: r.SortOrder,
  };
}

// Team list - public, login lagbe na. Home page-e marquee-te dekhabe.
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      'SELECT MemberID, FullName, Address, University, Department, Photo, SortOrder ' +
      'FROM TeamMembers ORDER BY SortOrder, MemberID'
    );
    res.json(result.recordset.map(mapMember));
  } catch (err) {
    console.error('Team list error:', err.message);
    res.status(500).json({ message: 'Team list ana gelo na.' });
  }
});

// Notun member add koro - Admin only. FullName lagbei.
router.post('/', auth, requireRole('Admin'), async (req, res) => {
  const { fullName, address, university, department, photo, sortOrder } = req.body;
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ message: 'Member-er full name lagbe.' });
  }
  if (!photoOk(photo)) {
    return res.status(400).json({ message: 'Chobi-ta thik na ba beshi boro. Choto chobi dao (JPG/PNG).' });
  }
  const orderNum = Number(sortOrder);
  if (sortOrder !== undefined && sortOrder !== '' && (!Number.isInteger(orderNum))) {
    return res.status(400).json({ message: 'Sort order ekta sonkha hote hobe.' });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('FullName', sql.NVarChar(100), fullName.trim())
      .input('Address', sql.NVarChar(300), address || null)
      .input('University', sql.NVarChar(200), university || null)
      .input('Department', sql.NVarChar(200), department || null)
      .input('Photo', sql.NVarChar(sql.MAX), photo || null)
      .input('SortOrder', sql.Int, Number.isInteger(orderNum) ? orderNum : 0)
      .query(
        'INSERT INTO TeamMembers (FullName, Address, University, Department, Photo, SortOrder) ' +
        'OUTPUT INSERTED.MemberID VALUES (@FullName, @Address, @University, @Department, @Photo, @SortOrder)'
      );
    res.json({ message: 'Team member add hoyeche.', memberId: result.recordset[0].MemberID });
  } catch (err) {
    console.error('Add team member error:', err.message);
    res.status(500).json({ message: 'Team member add holo na.' });
  }
});

// Member-er info bodlano - Admin only.
router.put('/:id', auth, requireRole('Admin'), async (req, res) => {
  const { fullName, address, university, department, photo, sortOrder } = req.body;
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ message: 'Member-er full name lagbe.' });
  }
  if (!photoOk(photo)) {
    return res.status(400).json({ message: 'Chobi-ta thik na ba beshi boro. Choto chobi dao (JPG/PNG).' });
  }
  const orderNum = Number(sortOrder);
  if (sortOrder !== undefined && sortOrder !== '' && (!Number.isInteger(orderNum))) {
    return res.status(400).json({ message: 'Sort order ekta sonkha hote hobe.' });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('MemberID', sql.Int, Number(req.params.id))
      .input('FullName', sql.NVarChar(100), fullName.trim())
      .input('Address', sql.NVarChar(300), address || null)
      .input('University', sql.NVarChar(200), university || null)
      .input('Department', sql.NVarChar(200), department || null)
      .input('Photo', sql.NVarChar(sql.MAX), photo || null)
      .input('SortOrder', sql.Int, Number.isInteger(orderNum) ? orderNum : 0)
      .query(
        'UPDATE TeamMembers SET FullName = @FullName, Address = @Address, ' +
        'University = @University, Department = @Department, Photo = @Photo, ' +
        'SortOrder = @SortOrder WHERE MemberID = @MemberID'
      );
    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Team member pai nai.' });
    }
    res.json({ message: 'Team member update hoyeche.' });
  } catch (err) {
    console.error('Update team member error:', err.message);
    res.status(500).json({ message: 'Team member update holo na.' });
  }
});

// Member delete koro - Admin only.
router.delete('/:id', auth, requireRole('Admin'), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('MemberID', sql.Int, Number(req.params.id))
      .query('DELETE FROM TeamMembers WHERE MemberID = @MemberID');
    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Team member pai nai.' });
    }
    res.json({ message: 'Team member delete hoyeche.' });
  } catch (err) {
    console.error('Delete team member error:', err.message);
    res.status(500).json({ message: 'Team member delete holo na.' });
  }
});

module.exports = router;
