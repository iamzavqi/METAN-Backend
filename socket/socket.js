const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const corsOptions = require("../config/corsOptions");
const BaseError = require("../errors/base.error");
const { JWT_SECRET } = require("../config/env");
const UserModel = require("../modules/user/user.module");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: corsOptions,
    transports: ["websocket", "polling"],
  });

  // 1. Auth: token + bazadan hozirgi rol va holat
  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth.token, JWT_SECRET);

      const user = await UserModel.findById(payload._id)
        .select("companyId role activated")
        .lean();
      if (!user || !user.activated) {
        throw new Error("User topilmadi yoki bloklangan");
      }

      socket.data.userId = String(user._id);
      socket.data.companyId = String(user.companyId);
      socket.data.role = user.role;
      next();
    } catch (err) {
      console.error("Socket auth xatosi:", err.message);
      next(BaseError.UnauthorizedError());
    }
  });

  // 2. Ulanish
  io.on("connection", async (socket) => {
    const { userId, companyId, role } = socket.data;
    console.log("Socket connected:", socket.id, "user:", userId, "role:", role);

    const userRoom = `user:${userId}`;
    const companyRoom = `company:${companyId}`;
    const roleRoom = `company:${companyId}:role:${role}`;

    socket.join([userRoom, companyRoom, roleRoom]);
    io.to(companyRoom).emit("onlineUsers", await getOnlineIds(companyRoom));

    socket.on("disconnect", async () => {
      console.log("Socket disconnected:", socket.id);
      try {
        const stillOnline = (await io.in(userRoom).fetchSockets()).length > 0;
        if (!stillOnline) {
          await UserModel.findByIdAndUpdate(userId, { lastSeen: new Date() });
        }
        io.to(companyRoom).emit("onlineUsers", await getOnlineIds(companyRoom));
      } catch (err) {
        console.error("Socket disconnect xatosi:", err.message);
      }
    });
  });
};

const getOnlineIds = async (companyRoom) => {
  const sockets = await io.in(companyRoom).fetchSockets();
  return [...new Set(sockets.map((s) => s.data.userId))];
};

// Kompaniyadagi aniq rollarga xabar yuborish
const emitToRoles = (companyId, roles, event, data) => {
  if (!io) return;
  const rooms = roles.map((role) => `company:${companyId}:role:${role}`);
  io.to(rooms).emit(event, data);
};

const getIO = () => io;

module.exports = { initSocket, getIO, emitToRoles };