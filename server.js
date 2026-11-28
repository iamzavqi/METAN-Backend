const express = require("express");
const cors = require("cors");
const http = require("http");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const errorMiddleware = require("./middleware/error.middleware");
const { initSocket } = require("./socket/socket");
const {initBot, stopBot} = require("./telegram/bot")
const app = express();
app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 15 * 1000, // 15 soniyada
  max: 100, // Har bir IP-dan 15 soniyada maksimal 100 ta so'rov
});
app.use(limiter);

// Config
const connectedDB = require("./config/db");
const corsOptions = require("./config/corsOptions");
const { PORT } = require("./config/env");

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use("/api", require("./routes/index.routes"));

app.use(errorMiddleware);

// SOCKET.IO
const serverInstance = http.createServer(app);
initSocket(serverInstance);

const server = async () => {
  try {
    await connectedDB();
    serverInstance.listen(PORT, () => {
      console.log(`Server ${PORT} da ishga tushdi `);
    });
    initBot()
  } catch (error) {
    console.error("Server xatosi:", error);
  }
};

// Server to'xtaganda botni ham to'g'ri to'xtatamiz
const shutdown = async () => {
  await stopBot();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

server();