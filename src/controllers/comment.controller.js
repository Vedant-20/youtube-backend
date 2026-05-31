import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Tweet } from "../models/tweet.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Check if videoId is a valid ObjectId
  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const pageNumber = parseInt(page);
  const limitOfComments = parseInt(limit);

  // Find the video
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Find comments for the video
  const comments = await Comment.aggregatePaginate(
    Comment.aggregate([
      {
        $match: {
          video: video._id,
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "comment",
          as: "likes",
        },
      },
      // bring user docs for all likedBy ids (will be used to populate each like)
      {
        $lookup: {
          from: "users",
          localField: "likes.likedBy",
          foreignField: "_id",
          as: "likedUsers",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $addFields: {
          // replace each like's likedBy ObjectId with the full user doc (minimal fields will be projected later)
          likes: {
            $map: {
              input: { $ifNull: ["$likes", []] },
              as: "l",
              in: {
                _id: "$$l._id",
                createdAt: "$$l.createdAt",
                likedBy: {
                  $let: {
                    vars: {
                      userDoc: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: { $ifNull: ["$likedUsers", []] },
                              as: "u",
                              cond: { $eq: ["$$u._id", "$$l.likedBy"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      _id: "$$userDoc._id",
                      username: "$$userDoc.username",
                    },
                  },
                },
              },
            },
          },
          // isLiked: check if current user exists in mapped likes' likedBy _id list
          isLiked: {
            $in: [
              req.user?.id,
              {
                $map: {
                  input: { $ifNull: ["$likes", []] },
                  as: "l",
                  in: "$$l.likedBy",
                },
              },
            ],
          },
          username: { $arrayElemAt: ["$user.username", 0] },
          avatar: { $arrayElemAt: ["$user.avatar", 0] },
          fullname: { $arrayElemAt: ["$user.fullname", 0] },
        },
      },
      {
        $project: {
          username: 1,
          fullname: 1,
          content: 1,
          avatar: 1,
          likes: 1,
          createdAt: 1,
          isLiked: 1,
        },
      },
      {
        $sort: { createdAt: -1 }, // Sort by createdAt in descending order
      },
    ]),
    { page: pageNumber, limit: limitOfComments }
  );

  if (comments.length === 0) {
    throw new ApiError(400, "No comments on the video");
  }

  // Return the paginated comments
  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  //getting content,video and user
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Invalid videoId");
  }

  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const user = await User.findOne(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "cannot find the video");
  }

  //storing on mongoDB
  const comment = await Comment.create({
    content: content,
    owner: user._id,
    video: video._id,
  });

  if (!comment) {
    throw new ApiError(500, "Error in creating the comment");
  }

  //returning the response
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Commented successfully"));
});

const addTweetComment = asyncHandler(async (req, res) => {
  //getting content,video and user
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "Invalid tweetId");
  }

  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const user = await User.findOne(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(400, "cannot find the tweet");
  }

  //storing on mongoDB
  const comment = await Comment.create({
    content: content,
    owner: user._id,
    tweet: tweet._id,
  });

  if (!comment) {
    throw new ApiError(500, "Error in creating the comment");
  }

  //returning the response
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Commented successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  //getting comment
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, "Cannot find comment id");
  }

  const comment = await Comment.findById(commentId);
  //validating if the user is the one updating the comment
  const user = await User.findOne(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (comment?.owner.equals(user._id.toString())) {
    const { content } = req.body;
    if (!content) {
      throw new ApiError(400, "Content is required");
    }

    //updating the comment
    comment.content = content;
    await comment.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, comment, "comment updated successfully"));
  } else {
    throw new ApiError(400, "Only the owner can update the comment");
  }
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, "comment Id cant be fetched for params");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json(new ApiResponse(404, {}, "Comment not found"));
  }

  const user = await User.findOne(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  //only the owner can delete the tweet
  if (comment?.owner.equals(user._id.toString())) {
    await Comment.findByIdAndDelete(commentId);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment deleted successfully"));
  } else {
    throw new ApiError(401, "Only user can delete the comment");
  }
});

export {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
  addTweetComment,
};
