import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const HealthCheck=asyncHandler(async(req,res)=>{
    res.status(200).json(new ApiResponse(200,{},'Health Tested'))
})

export {HealthCheck}