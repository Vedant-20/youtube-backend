import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all messages between two users
const getMessages = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  const senderId = req.user?._id;
  const { page = 1, limit = 50 } = req.query;

  if (!mongoose.isValidObjectId(receiverId)) {
    throw new ApiError(400, "Invalid receiver Id");
  }

  if (!senderId) {
    throw new ApiError(401, "User not authenticated");
  }

  // Check if receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(404, "Receiver not found");
  }

  const pageNumber = parseInt(page);
  const limitOfMessages = parseInt(limit);
  const skipValue = (pageNumber - 1) * limitOfMessages;

  const messages = await Message.find({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(skipValue)
    .limit(limitOfMessages)
    .populate("sender", "username avatar fullname")
    .populate("receiver", "username avatar fullname");

  const totalMessages = await Message.countDocuments({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        messages: messages.reverse(),
        pagination: {
          page: pageNumber,
          limit: limitOfMessages,
          total: totalMessages,
          pages: Math.ceil(totalMessages / limitOfMessages),
        },
      },
      "Messages fetched successfully"
    )
  );
});

// Send a message
const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  const { content } = req.body;
  const senderId = req.user?._id;

  if (!mongoose.isValidObjectId(receiverId)) {
    throw new ApiError(400, "Invalid receiver Id");
  }

  if (!senderId) {
    throw new ApiError(401, "User not authenticated");
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, "Message content is required");
  }

  if (senderId.toString() === receiverId.toString()) {
    throw new ApiError(400, "Cannot send message to yourself");
  }

  // Check if receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(404, "Receiver not found");
  }

  const message = await Message.create({
    sender: senderId,
    receiver: receiverId,
    content: content.trim(),
  });

  const populatedMessage = await message.populate(
    "sender",
    "username avatar fullname"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedMessage, "Message sent successfully"));
});

// Mark message as read
const markAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.isValidObjectId(messageId)) {
    throw new ApiError(400, "Invalid message Id");
  }

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.receiver.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only mark your own messages as read");
  }

  message.isRead = true;
  await message.save();

  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message marked as read"));
});

// Mark all messages in a conversation as read
const markConversationAsRead = asyncHandler(async (req, res) => {
  const { senderId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.isValidObjectId(senderId)) {
    throw new ApiError(400, "Invalid sender Id");
  }

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  await Message.updateMany(
    { sender: senderId, receiver: userId, isRead: false },
    { isRead: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "All messages in conversation marked as read")
    );
});

// Get all conversations for current user
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [
          { sender: new mongoose.Types.ObjectId(userId) },
          { receiver: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
            "$receiver",
            "$sender",
          ],
        },
        lastMessage: { $max: "$createdAt" },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$receiver", new mongoose.Types.ObjectId(userId)] },
                  { $eq: ["$isRead", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $sort: { lastMessage: -1 },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        username: "$user.username",
        avatar: "$user.avatar",
        fullname: "$user.fullname",
        lastMessage: 1,
        unreadCount: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, conversations, "Conversations fetched successfully")
    );
});

// Delete a message
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.isValidObjectId(messageId)) {
    throw new ApiError(400, "Invalid message Id");
  }

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.sender.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only delete your own messages");
  }

  await Message.findByIdAndDelete(messageId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Message deleted successfully"));
});

export {
  getMessages,
  sendMessage,
  markAsRead,
  markConversationAsRead,
  getConversations,
  deleteMessage,
};
