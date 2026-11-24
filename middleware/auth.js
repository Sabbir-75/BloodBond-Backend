// BloodBond Backend - login check (JWT) + role check
// Every protected route uses these. No route trusts a request without a token.

const jwt = require('jsonwebtoken');

// Check the token from the request header: Authorization: Bearer <token>
// If the token is valid, put the user (userId + role) on req.user and continue.
// If there is no token or it is wrong/expired, stop with 401.
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Login koro age. Token pai nai.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token thik na ba meyad sesh. Abar login koro.' });
  }
}

// Allow only the given roles. Example: requireRole('Admin')
// Use after auth():  router.get('/x', auth, requireRole('Admin'), ...)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Ei kaj ta tomar role diye kora jabe na.' });
    }
    next();
  };
}

module.exports = { auth, requireRole };
