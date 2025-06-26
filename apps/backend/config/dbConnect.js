const mongoose=require("mongoose");


const dbConnect=async()=>{mongoose.connect("mongodb+srv://arunkumarveerapandian4:RnLrgUqPl9gYe3E1@service.uiitzln.mongodb.net/?retryWrites=true&w=majority&appName=service/test")};
//arunkumarveerapandian4
//RnLrgUqPl9gYe3E1


//mongodump --uri="mongodb+srv://arunkumarveerapandian4:RnLrgUqPl9gYe3E1@service.uiitzln.mongodb.net/?retryWrites=true&w=majority&appName=service/rentalDB" --db=mydatabase --archive=mydatabase.archive.gz --gzip


module.exports=dbConnect;