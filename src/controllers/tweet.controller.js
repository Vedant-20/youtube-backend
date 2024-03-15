import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createTweet=asyncHandler(async(req,res)=>{
    // get content , link with user
    // store on mongo 
    // retuen res

    const {content}=req.body

    const user=await User.findById(req.user?._id)

    if(!content){
        throw new ApiError(400,'Content is Required')
    }

    if(!user){
        throw new ApiError(400,'Cannot Fetch User')
    }

    const tweet=await Tweet.create({
        owner:user._id,
        content:content
    })


    return (
        res
        .status(200)
        .json(new ApiResponse(200,tweet,'Tweet created Successfullly'))
    )
})


const getUserTweets=asyncHandler(async(req,res)=>{
    // get the user id

    const {userId}=req.params
    // const { page = 1, limit = 10 } = req.query;

    if(!userId){
        throw new ApiError(400,'User Id cannot be found from params')
    }


    // query the user tweets by id
    const userTweets=await Tweet.find({
        owner:userId
    })

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

 
    return (
        res
        .status(200)
        .json(new ApiResponse(200,userTweets,'Tweets fetched Successfully'))
    )


})


const updateTweet=asyncHandler(async(req,res)=>{
    // getting TweetId and content
    const {tweetId}=req.params
    if(!tweetId){
        throw new ApiError(400,'Unable to Fetch Tweet Id from params')
    }

    // only the owner can update the tweet
    const tweet=await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(400,'Cant Find Tweet')
    }

    const user=await User.findOne({
        refreshToken:req.cookies.refreshToken,
    })

    if(!user){
        throw new ApiError(400,'User not Found')
    }

    if(tweet?.owner.equals(user._id.toString())){
        const {content}=req.body

        if(!content){
            throw new ApiError(400,'Please Provide COntent To Update')
        }

        tweet.content=content

        await tweet.save({validateBeforeSave:false})

        return(
            res
            .status(200)
            .json(new ApiResponse(200,tweet,'Tweet Updated Successfully'))
        )


    }
    else{
        throw new ApiError(400,"Only the owner can update the tweet")
    }
})


const deleteTweet=asyncHandler(async(req,res)=>{
    const {tweetId}=req.params

    if(!tweetId){
        throw new ApiError(400,'Unable to Fetch TweetId from Params')
    }

    const tweet=await Tweet.findById(tweetId)

    const user = await User.findOne({
        refreshToken: req.cookies.refreshToken,
    })
    if (!user) {
        throw new ApiError(404, "User not found")
    }


    //only the owner can delete the tweet
    if (tweet?.owner.equals(user._id.toString())) {
        await Tweet.findByIdAndDelete(tweetId)
        return(
            res
            .status(200)
            .json(new ApiResponse(200,{},"Tweet deleted successfully"))
        )
    }else{
        throw new ApiError(401,"Only user can delete the tweet")
    }
})


const getAllTweets=asyncHandler(async(req,res)=>{
    const tweets=await Tweet.find({
        isTweeted:true
    })

    return (
        res
        .status(200)
        .json(new ApiResponse(200,tweets,'All Tweets Fetched Successfully'))
    )
})

export {createTweet,getUserTweets,updateTweet,deleteTweet,getAllTweets}