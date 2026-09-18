const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'No token provided. Please login.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.userId = decoded.id;
    next();
  });
};

// Optional auth: kung may valid token, ilalagay ang req.userId (para ma-personalize
// ang response, hal. allergen filtering). Kung walang token o invalid, dumidiretso
// pa rin ito (hindi nagre-reject) — ginagamit ito ng mga endpoints na dapat gumana
// kahit walang login (Admin Web), pero mas "matalino" kapag may login (Mobile App).
const optionalVerifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // walang token, dumiretso na lang, walang req.userId
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      req.userId = decoded.id;
    }
    next(); // dumidiretso pa rin kahit invalid ang token
  });
};

module.exports = verifyToken;
module.exports.optionalVerifyToken = optionalVerifyToken;