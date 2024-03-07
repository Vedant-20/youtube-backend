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






export {publishVideo}