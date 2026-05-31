import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  // get content , link with user
  // store on mongo
  // retuen res

  const { content } = req.body;

  const user = await User.findById(req.user?._id);

  if (!content) {
    throw new ApiError(400, "Content is Required");
  }

  if (!user) {
    throw new ApiError(400, "Cannot Fetch User");
  }

  const tweet = await Tweet.create({
    owner: user._id,
    content: content,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created Successfullly"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // get the user id

  const { userId } = req.params;
  // const { page = 1, limit = 10 } = req.query;

  if (!userId) {
    throw new ApiError(400, "User Id cannot be found from params");
  }

  // query the user tweets by id
  const userTweets = await Tweet.find({
    owner: userId,
  });

  //sample code start

  // const pageNumber = parseInt(page);
  // const limitOfTweets = parseInt(limit);
  // const userTweets=await Tweet.aggregatePaginate(
  //     Tweet.aggregate([
  //         {
  //             $match:{
  //                 owner:userId
  //             }
  //         },
  //         {
  //             $lookup:{
  //                 from:"likes",
  //                 localField:"_id",
  //                 foreignField:"tweet",
  //                 as:"likes"
  //             }
  //         },
  //         {
  //             $lookup:{
  //                 from:'users',
  //                 localField:'owner',
  //                 foreignField:'_id',
  //                 as:'user'

  //             }
  //         },
  //         {
  //             $addFields:{
  //                 likes:{
  //                     $size:"$likes"
  //                 },
  //                 isLiked:{
  //                     $in:[req.user?.id,"$likes.likedBy"]
  //                 },
  //                 username:{
  //                     $arrayElemAt:["$user.username",0]
  //                 },
  //                 avatar:{
  //                     $arrayElemAt:["$user.avatar",0]
  //                 },
  //                 fullname:{
  //                     $arrayElemAt:["$user.fullname",0]
  //                 }
  //             }
  //         },
  //         {
  //             $project:{
  //                 username:1,
  //                 fullname:1,
  //                 avatar:1,
  //                 content:1,
  //                 likes:1,
  //                 createdAt:1,
  //                 isLiked:1
  //             }
  //         },
  //         {
  //             $sort: { createdAt: -1 } // Sort by createdAt in descending order
  //         }
  //     ]),
  //     { page: pageNumber, limit: limitOfTweets }
  // );
  // if(userTweets.length===0){
  //     throw new ApiError(400,"No Tweets on this USer")
  // }

  return res
    .status(200)
    .json(new ApiResponse(200, userTweets, "Tweets fetched Successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  // getting TweetId and content
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "Unable to Fetch Tweet Id from params");
  }

  // only the owner can update the tweet
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(400, "Cant Find Tweet");
  }

  const user = await User.findOne(req.user?._id);

  if (!user) {
    throw new ApiError(400, "User not Found");
  }

  if (tweet?.owner.equals(user._id.toString())) {
    const { content } = req.body;

    if (!content) {
      throw new ApiError(400, "Please Provide COntent To Update");
    }

    tweet.content = content;

    await tweet.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, tweet, "Tweet Updated Successfully"));
  } else {
    throw new ApiError(400, "Only the owner can update the tweet");
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId) {
    throw new ApiError(400, "Unable to Fetch TweetId from Params");
  }

  const tweet = await Tweet.findById(tweetId);

  const user = await User.findOne(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  //only the owner can delete the tweet
  if (tweet?.owner.equals(user._id.toString())) {
    await Tweet.findByIdAndDelete(tweetId);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
  } else {
    throw new ApiError(401, "Only user can delete the tweet");
  }
});

const getAllTweets = asyncHandler(async (req, res) => {
  const tweets = await Tweet.aggregate([
    { $match: { isTweeted: true } },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "likes.likedBy",
        foreignField: "_id",
        as: "likes.likedBy",
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "All Tweets Fetched Successfully"));
});

const getAllTweetsV2 = asyncHandler(async (req, res) => {
  const tweets = await Tweet.aggregate([
    { $match: { isTweeted: true } },
    { $sort: { createdAt: -1 } },
    // populate owner as a full user object
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
    // lookup likes for each tweet
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },
    // populate users who liked (optional, keeps liked user details)
    {
      $lookup: {
        from: "users",
        localField: "likes.likedBy",
        foreignField: "_id",
        as: "likes.likedBy",
      },
    },
    // lookup comments for each tweet and populate comment owner with minimal fields
    {
      $lookup: {
        from: "comments",
        let: { tweetId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$tweet", "$$tweetId"] } } },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
            },
          },
          { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
          // lookup likes for each comment
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "comment",
              as: "likes",
            },
          },
          // lookup users for likedBy
          {
            $lookup: {
              from: "users",
              localField: "likes.likedBy",
              foreignField: "_id",
              as: "likedUsers",
            },
          },
          // map likes to include likedBy with minimal user fields
          {
            $addFields: {
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
                          avatar: "$$userDoc.avatar",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          {
            $project: {
              content: 1,
              createdAt: 1,
              updatedAt: 1,
              "owner._id": 1,
              "owner.username": 1,
              "owner.avatar": 1,
              likes: 1,
            },
          },
        ],
        as: "comments",
      },
    },
    // map likes.likedBy to only include minimal user info
    {
      $addFields: {
        "likes.likedBy": {
          $map: {
            input: { $ifNull: ["$likes.likedBy", []] },
            as: "u",
            in: {
              _id: "$$u._id",
              username: "$$u.username",
              avatar: "$$u.avatar",
            },
          },
        },
      },
    },
    // remove sensitive fields from owner and top-level __v (exclusion-only projection)
    {
      $project: {
        "owner.password": 0,
        "owner.refreshToken": 0,
        "owner.__v": 0,
        __v: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "All Tweets Fetched Successfully"));
});

export {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
  getAllTweets,
  getAllTweetsV2,
};
