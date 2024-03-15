import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from '../utils/ApiError.js'
import { Video } from "../models/video.model.js"
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import mongoose from 'mongoose'






const publishVideo=asyncHandler(async(req,res)=>{
    // get title and description
    // get video and thumbnail
    // upload on cloudinary
    // upload on mongo
    // return res

    // get title and description
    const {title, description}=req.body
    console.log(title)

    if(!title){
        throw new ApiError(400,'Title for a video is Required')
    }

    if(!description){
        throw new ApiError(400,'Description is Required')
    }

    // console.log(req.files)

    // get video and thumbnail
    const videoLocalPath=req.files?.videoFile?.[0]?.path
    // console.log(videoLocalPath)
    if(!videoLocalPath){
        throw new ApiError(400,'No video Found')
    }

    const thumbnailLocalPath=req.files?.thumbnail?.[0]?.path
    // console.log(thumbnailLocalPath)
    if(!thumbnailLocalPath){
        throw new ApiError(400,'No Thumbnail FOund')
    }

    //upload on cloudinary
    const videoFile=await uploadOnCloudinary(videoLocalPath)
    if(!videoFile){
        throw new ApiError(400,'Video is not uploaded  on cloudinary')
    }

    const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnail){
        throw new ApiError(400,'Thumbnail not uploaded on cloudinary')
    }


    console.log('Video and Thmbanail uploaded on cloudinary')

    //getting the user
    const user=await User.findById(req.user?._id)


    //store the data on mongo
    const video=await Video.create(
        {
            videoFile:videoFile.secure_url,
            thumbnail:thumbnail.url,
            owner:user._id,
            title:title,
            description:description || '',
            duration:videoFile.duration
        }
    )


    //return the res
    return (
        res
        .status(200)
        .json(new ApiResponse(200,video,'Video Uploaded Successfully'))
        )
})


// const getAllVideos=asyncHandler(async(req,res)=>{
//     const {page=1,limit=10,query,sortBy,sortType}=req.query

//     const user=await User.find(
//         {
//             refreshToken:req.cookies.refreshToken
//         }
//     )

//     const pageNumber=parseInt(page)
//     const limitOfComments=parseInt(limit)

//     if(!user){
//         throw new ApiError(400,'User is Required')
//     }

//     const skip=(pageNumber-1) * limitOfComments

//     const pageSize=limitOfComments

//     const videos=await Video.aggregatePaginate(
//         Video.aggregate(
//             [
//                 {
//                     $match:{
//                         $or:[
//                             {title:{$regex:query, $options:'i'}},
//                             {description:{$regex:query,$options:'i'}}
//                         ],
//                         isPublished:true,
//                         owner:user._id
                            
                        
//                     }
//                 },
//                 {
//                     $lookup:{
//                         from:'likes',
//                         localField:'_id',
//                         foreignField:'video',
//                         as:'likes'
//                     }
//                 },
//                 {
//                     $addFields:{
//                         likes:{
//                             $size:'$likes'
//                         }
//                     }
//                 },
//                 {
//                     $project:{
//                         '_id':1,
//                         'videoFile':1,
//                         'thumbnail':1,
//                         'title':1,
//                         'description':1,
//                         'duration':1,
//                         'views':1,
//                         'isPublished':1,
//                         'owner':1,
//                         'createdAt':1,
//                         'updatedAt':1,
//                         'likes':1
//                     }
//                 },
//                 {$sort:{[sortBy]:sortType==='asc' ? 1 : -1}},
//                 {$skip:skip},
//                 {$limit:pageSize}
//             ]
//         )
//     )

//     if(videos.length===0){
//         return res.status(200).json(new ApiResponse(200, "No videos available."));
//     }

//     //Return the videos
//     return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
// })


const getAllVideos=asyncHandler(async(req,res)=>{
   const videos= await Video.find({
        isPublished:true
    })

    return res.status(200).json(new ApiResponse(200,videos,'dbhasvdhkasb jnsajdnhsajnskadmnpasin'))
})


const getVideoById=asyncHandler(async(req,res)=>{
    try {
        const {videoId}=req.params
        if(!videoId){
            throw new ApiError(400,"videoId cant be fetched from params")
        }

        const video=await Video.findById(videoId)

        if(!video){
            throw new ApiError(400,"Cant find video")
        }

        return (
            res
            .status(200)
            .json(new ApiResponse(200,video,'Video Fetched Successfully'))
        )
    } catch (error) {
        throw new ApiError(400,`Internal Error ${error}`)
    }
})



const updateVideoDetails=asyncHandler(async(req,res)=>{
    const {videoId}=req.params

    if (!videoId) {
        throw new ApiError(400, "videoId cant be fetched from params")
    }

    //only owner can update video details
    const video=await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const user=await User.findOne({
        refreshToken:req.cookies.refreshToken
    })

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    if (!video.owner.equals(user._id.toString())) {
        throw new ApiError(403, "Only the owner can update video details")
    }


    // Update title and description
    const { title, description } = req.body
    if (!title) {
        throw new ApiError(400, "Title is required")
    }
    if (!description) {
        throw new ApiError(400, "Description is required")
    }
    video.title = title
    video.description = description

    // Update thumbnail
    const newThumbnailLocalFilePath = req.file?.path
    if (!newThumbnailLocalFilePath) {
        throw new ApiError(400, "Thumbnail is not uploaded")
    }
    const thumbnail = await uploadOnCloudinary(newThumbnailLocalFilePath)
    if (!thumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail to Cloudinary")
    }
    video.thumbnail = thumbnail.url

    // Save the changes
    await video.save();

    // Return the response
    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video details updated successfully"))
})


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId){
        throw new ApiError(400,"videoId cant be fetched from params")
    }
    
    const video = await Video.findById(videoId)
    const user = await User.findOne({
        refreshToken: req.cookies.refreshToken 
    })
    if (!user) {
        throw new ApiError(404, "User not found")
    }


    //only the owner can delete the video
    if (video?.owner.equals(user._id.toString())) {
        await Video.findByIdAndDelete(videoId)
        return(
            res
            .status(200)
            .json(new ApiResponse(200,{},"Video deleted successfully"))
        )
    }else{
        throw new ApiError(401,"Only user can delete the video")
    }

    
})


const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId){
        throw new ApiError(400,"videoId cant be fetched from params")
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    video.isPublished = !video.isPublished;

    await video.save({ validateBeforeSave: false })

    return(
        res
        .status(200)
        .json(new ApiResponse(200,video.isPublished,"Video publish toggled successfully"))
    )
})


const getVideoByChannelId=asyncHandler(async(req,res)=>{
    const {channelId}=req.params

    const user=await User.findById(channelId)

    if(!user){
        throw new ApiError(404,"User not found")
    }

    const videos=await Video.find({
        owner:user?._id
    })

    if (!videos || videos.length === 0) {
        throw new ApiError(500, "Error while fetching the videos")
    }

    return(
        res
        .status(200)
        .json(new ApiResponse(200,videos,"Channel Videos fetched successfully"))
    )
})



export {publishVideo,getAllVideos,getVideoById,updateVideoDetails,deleteVideo,togglePublishStatus,getVideoByChannelId}