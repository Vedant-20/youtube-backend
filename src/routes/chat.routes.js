import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getMessages,
  sendMessage,
  markAsRead,
  markConversationAsRead,
  getConversations,
  deleteMessage,
} from "../controllers/chat.controller.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// Get all conversations for current user
router.get("/conversations", getConversations);

// Get messages between current user and another user
router.get("/:receiverId", getMessages);

// Send a message
router.post("/:receiverId", sendMessage);

// Mark a single message as read
router.patch("/:messageId/read", markAsRead);

// Mark all messages in a conversation as read
router.patch("/read/:senderId", markConversationAsRead);

// Delete a message
router.delete("/:messageId", deleteMessage);

export default router;
