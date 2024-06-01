// require('dotenv').config({path:'./env'})
import dotenv from "dotenv";

// import mongoose from "mongoose";
// import {DB_NAME} from './constants'
import connectDB from "./db/index.js";
import { app } from "./app.js";
import job from "./cron/cron.js";

dotenv.config({
  path: "./env",
});

// job.start();
// not using cron jobs due to instance hours

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDb connection failed !!!!", err);
  });

/*
import express from 'express'
const app=express()

;(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        app.on('error',(error)=>{
            console.log("ERror",error)
            throw error
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App is Listening on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("Error", error)
        throw error
    }
})()  

*/
