const mongoose=require("mongoose");


const dbConnect = async () => {
  try {
    await mongoose.connect("mongodb://onstepadmin:@Agent000000@3.111.58.3:27017/onstepdb", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      authSource: "admin",
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
  }
};

// const dbConnect=async()=>{mongoose.connect("mongodb+srv://arunkumarveerapandian4:RnLrgUqPl9gYe3E1@service.uiitzln.mongodb.net/?retryWrites=true&w=majority&appName=service/test")};


//arunkumarveerapandian4
//RnLrgUqPl9gYe3E1


//mongodump --uri="mongodb+srv://arunkumarveerapandian4:RnLrgUqPl9gYe3E1@service.uiitzln.mongodb.net/?retryWrites=true&w=majority&appName=service/rentalDB" --db=mydatabase --archive=mydatabase.archive.gz --gzip


module.exports=dbConnect;