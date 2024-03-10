import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTweet, getUserTweets,updateTweet,deleteTweet, getAllTweets } from "../controllers/tweet.controller.js";

const router=Router()

router.route('/create-tweet').post(verifyJWT,createTweet)
router.route('/user/:userId').get(verifyJWT,getUserTweets)
router.route("/:tweetId").patch(verifyJWT,updateTweet)
router.route("/:tweetId").delete(verifyJWT,deleteTweet)
router.route('/get-all-tweets').get(getAllTweets)

export default router