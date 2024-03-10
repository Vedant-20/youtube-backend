import mongoose,{Schema} from "mongoose";

const tweetSchema=new Schema(
    {
        content:{
            type:String,
            required:true
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:'User'
        },
        isTweeted:{
            type:Boolean,
            default:true
        }
    },
    {
        timestamps:true
    }
)


export const Tweet=mongoose.model('Tweet',tweetSchema)