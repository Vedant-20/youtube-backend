import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'




const generateAccessAndRefreshTokens=async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=await user.generateAccessToken()
        const refreshToken=await user.generateRefreshToken() 

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,'Something went wrong while generating refresh and access tokens')
    }
}

const registerUser=asyncHandler(async (req,res)=>{
    //get user details from frontend
    //validation-not empty
    //check if user already exists: username, email
    //check for images and check for avatar
    //upload them to cloudinary, avatart check
    //create useer object -create entry in db
    //remove password and refresh token fiel from response
    //check for user creation
    //return res
    const {fullname, email, username, password }=req.body
    console.log('EMail:  ', email)


    // if(fullname===""){
    //     throw new ApiError(400,"fullname is required")
    // }

    if(
        [fullname,email,username,password].some((field)=>field?.trim()==="")
    ) {
        throw new ApiError(400,"All fields are required")
    }


    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }

    console.log('ciofcgcer image',req.files)

    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage?.[0]?.path;

    

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar local path  file is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    console.log(avatarLocalPath)
    

    if(!avatar){
        throw new ApiError(400,"Avatar  file is required")
    }


    const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

   const createdUser=await User.findById(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
   }


   return res.status(201).json(
    new ApiResponse(200,createdUser,"User Registered Successfully")
   )

})


const loginUser=asyncHandler(async(req,res)=>{
    //req body -> data
    //username or email
    //find the user
    //passwrod check
    //access and refresh token
    //send token in cookies

    const {email,username,password}=req.body
    if(!(username || email)){
        throw new ApiError(400,'username or email is required')
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })


    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,'Password is Incorrect')
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:false
    }

    return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
        new ApiResponse(200,{user:loggedInUser,accessToken,refreshToken},"User Logged In Successfully")
    )


})

const logoutUser=asyncHandler(async(req,res)=>{
    
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{refreshToken:undefined}
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:false
    }

    return res
        .status(200)
        .clearCookie('accessToken',options)
        .clearCookie('refreshToken',options)
        .json(new ApiResponse(200, {} , 'User Logged out'))
})



const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user=await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,'Invalid refresh token')
        }
    
        if(incomingRefreshToken !==user?.refreshToken){
            throw new ApiError(401,'Refresh Token is Expired or used')
        }
    
        const options={
            httpOnly:true,
            secure:false
        }
    
        const {accessToken, newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
    
        return res
            .status(200)
            .cookie('accessToken',accessToken, options)
            .cookie('refreshToken',newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {accessToken,refreshToken:newRefreshToken},
                    'Access Token Refreshed'
                )
            )
    } catch (error) {
        throw new ApiError(401,error?.message || 'Invalid Refresh Token')
    }

})


const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword}=req.body

    const user=await User.findById(req.user?._id)

    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,'Invalid Old Password')
    }

    user.password=newPassword

    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ApiResponse(200,{},'Password Changed Successfully'))
})


const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).json(200,req.user,'cuurent User fetched successffully')
})


const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullname,email}=req.body

    if(!fullname || !email){
        throw new ApiError(400,'All fields are required')
    }

   const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email: email
            }
        },
        {new:true}
        ).select('-password')

        return res
            .status(200)
            .json(new ApiResponse(200,user,'Account Details updated Successfully'))
})


const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,'Avatar file is missing')
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,'Error while uploading an avatar')
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select('-password')

    return res
        .status(200)
        .json(new ApiResponse(200,user,'avatar image updated successfully'))
})



const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,'cover file is missing')
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,'Eroor while uploading cover file')
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select('-password')

    return res
        .status(200)
        .json(new ApiResponse(200,user,'cover image updated successfully'))
})

export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails, updateUserAvatar ,updateUserCoverImage}