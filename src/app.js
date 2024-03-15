import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app=express()

app.use(cors(
    
))


// {
//     origin:process.env.CORS_ORIGIN,
//     credentials:true,
//     withCredentials:true
    
//     // allowedHeaders:[
//     //     'Access-Control-Allow-Origin',
//     //     'Content-Type',
//     //     'Authorization'
//     // ]

// }

app.set("trust proxy", 1)


app.use(express.json({limit:'16kb'}))

app.use(express.urlencoded({extended:true, limit:'16kb'}))

app.use(express.static('public'))

app.use(cookieParser())



//routes import

import userRouter from './routes/user.routes.js'
import videoRouter from './routes/video.routes.js'
import tweetRouter from './routes/tweet.routes.js'
import subscriptionRouter from './routes/subscription.routes.js'
import playlistRouter from './routes/playlist.routes.js'
import likeRouter from './routes/like.routes.js'
import dashboardRouter from './routes/dashboard.routes.js'
import commentRouter from './routes/comment.routes.js'


//routes declarartion
app.use('/api/v1/users',userRouter)
app.use('/api/v1/videos',videoRouter)
app.use('/api/v1/tweets',tweetRouter)
app.use('api/v1/subscriptions',subscriptionRouter)
app.use('api/v1/playlist',playlistRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/comments", commentRouter)

//https:localhost:8000/api/v1/users/resgiter  ----example



export {app}