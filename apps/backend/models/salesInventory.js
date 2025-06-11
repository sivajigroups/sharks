const mongoose=require("mongoose");

const salesSchema=new mongoose.Schema({
    customer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Customer",
        required:true,
    },
    inventory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Inventory",
        required:true,
    },
    quantity:{
        type:Number,
        required:true,
    },
    totalPrice:{
        type:Number,
        required:true,
    },
    saleDate:{
        type:Date,
        default:Date.now,
    },
});


const Sales=mongoose.model("Sales",salesSchema);


module.exports={
    Sales,
}