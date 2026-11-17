const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const corsOptions = require("../config/corsOptions");
const BaseError = require("../errors/base.error");
const { JWT_SECRET } = require("../config/env");
const UserModel = require("../modules/user/user.model");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: corsOptions,
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth.token, JWT_SECRET);
      socket.userId = payload._id;
      socket.companyId = payload.companyId;
      next();
    } catch (err) {
      console.error("Socket auth xatosi:", err.message);
      next(BaseError.UnauthorizedError());
    }
  });

  io.on("connection", async (socket) => {
    console.log("Socket connected:", socket.id, "user:", socket.userId);
    const userRoom = `user:${socket.userId}`;
    const companyRoom = `company:${socket.companyId}`;
    socket.join([userRoom, companyRoom]);
    io.to(companyRoom).emit("onlineUsers", await getOnlineIds(companyRoom));

    socket.on("disconnect", async () => {
      console.log("Socket disconnected:", socket.id);
      try {
        const stillOnline = (await io.in(userRoom).fetchSockets()).length > 0;
        if (!stillOnline) {
          await UserModel.findByIdAndUpdate(socket.userId, {
            lastSeen: new Date(),
          });
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
  return [...new Set(sockets.map((s) => s.userId))];
};

const getIO = () => io;

module.exports = { initSocket, getIO };
