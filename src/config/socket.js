const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('./database');

let io = null;

// Live updates (tickets). Clients connect with their login token:
//   io(URL, { auth: { token } })
// - Admin token (role: 'admin') joins the "admins" room.
// - User token (id) joins its own "user:<id>" room, so a user only ever
//   receives events about their own tickets.
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role === 'admin') {
        socket.data.role = 'admin';
        return next();
      }

      if (!decoded.id) return next(new Error('Invalid token'));

      // Same account checks as verifyToken (banned / deactivated users are refused)
      const result = await pool.query(
        'SELECT is_active, banned FROM users WHERE id = $1',
        [decoded.id]
      );
      const account = result.rows[0];
      if (!account || account.banned || !account.is_active) {
        return next(new Error('Account not allowed'));
      }

      socket.data.role = 'user';
      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.data.role === 'admin') {
      socket.join('admins');
    } else {
      socket.join(`user:${socket.data.userId}`);
    }
  });

  return io;
};

const emitToAdmins = (event, payload = {}) => {
  if (io) io.to('admins').emit(event, payload);
};

const emitToUser = (userId, event, payload = {}) => {
  if (io && userId) io.to(`user:${userId}`).emit(event, payload);
};

module.exports = { initSocket, emitToAdmins, emitToUser };