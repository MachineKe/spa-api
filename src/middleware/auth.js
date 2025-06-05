const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to verify JWT and attach user to req.user
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware to require a specific role (or array of roles)
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userRole = (req.user.role || "").toLowerCase();
    if (Array.isArray(roles)) {
      const allowed = roles.map(r => r.toLowerCase());
      if (!allowed.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }
    } else {
      if (userRole !== String(roles).toLowerCase()) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }
    }
    next();
  };
}

module.exports = {
  authenticateJWT,
  requireRole,
};
