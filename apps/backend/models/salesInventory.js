const mongoose=require("mongoose");


const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  brand: { type: String, required: true },
  size: { type: String, required: true },
  color: { type: String, default: null },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
});

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