const mongoose=require("mongoose");


const dbConnect=async()=>{mongoose.connect("mongodb+srv://arunkumarveerapandian4:RnLrgUqPl9gYe3E1@service.uiitzln.mongodb.net/?retryWrites=true&w=majority&appName=service/rentalDB")};
//arunkumarveerapandian4
//RnLrgUqPl9gYe3E1

module.exports=dbConnect;