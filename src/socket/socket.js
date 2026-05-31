import { Server } from "socket.io";
import { Message } from "../models/message.model.js";
import jwt from "jsonwebtoken";

const userSockets = {}; // Store userId -> socketId mapping for active users

export const initializeSocket = (server) => {
  const allowedOrigins = [process.env.CORS_ORIGIN, process.env.NEW_CORS_ORIGIN].filter(Boolean);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : true,
      credentials: true,
    },
  });

  // Middleware to verify JWT token
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication token is required"));
      }

      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.userId = decodedToken._id;
      socket.username = decodedToken.username;

      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    console.log(
      `User connected: ${socket.userId} with socket id: ${socket.id}`
    );

    // Store user socket mapping
    userSockets[socket.userId] = socket.id;
    io.emit("userOnline", {
      userId: socket.userId,
      username: socket.username,
      onlineUsers: Object.keys(userSockets),
    });

    // Join a private room for the user (for receiving direct messages)
    socket.join(`user:${socket.userId}`);

    // Handle sending message via socket
    socket.on("sendMessage", async (data) => {
      try {
        const { receiverId, content } = data;

        if (!receiverId || !content) {
          socket.emit("error", "Missing receiverId or content");
          return;
        }

        // Save message to database
        const message = await Message.create({
          sender: socket.userId,
          receiver: receiverId,
          content: content.trim(),
        });

        const populatedMessage = await message.populate(
          "sender",
          "username avatar fullname"
        );

        // Emit to receiver if they're connected
        io.to(`user:${receiverId}`).emit("receiveMessage", {
          _id: populatedMessage._id,
          sender: populatedMessage.sender,
          receiver: populatedMessage.receiver,
          content: populatedMessage.content,
          isRead: populatedMessage.isRead,
          createdAt: populatedMessage.createdAt,
        });

        // Emit to sender
        socket.emit("messageSent", {
          _id: populatedMessage._id,
          sender: populatedMessage.sender,
          receiver: populatedMessage.receiver,
          content: populatedMessage.content,
          isRead: populatedMessage.isRead,
          createdAt: populatedMessage.createdAt,
        });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", "Failed to send message");
      }
    });

    // Handle typing indicator
    socket.on("typing", (data) => {
      const { receiverId } = data;
      io.to(`user:${receiverId}`).emit("userTyping", {
        userId: socket.userId,
        username: socket.username,
      });
    });

    // Handle stop typing indicator
    socket.on("stopTyping", (data) => {
      const { receiverId } = data;
      io.to(`user:${receiverId}`).emit("userStoppedTyping", {
        userId: socket.userId,
      });
    });

    // Handle message read status
    socket.on("messageRead", async (data) => {
      try {
        const { messageId, receiverId } = data;
        await Message.findByIdAndUpdate(messageId, { isRead: true });

        io.to(`user:${receiverId}`).emit("messageReadReceipt", {
          messageId,
          isRead: true,
        });
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
      delete userSockets[socket.userId];

      io.emit("userOffline", {
        userId: socket.userId,
        onlineUsers: Object.keys(userSockets),
      });
    });

    // Error handling
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  return io;
};
