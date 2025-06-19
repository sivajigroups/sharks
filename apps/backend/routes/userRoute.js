const express = require("express");
const { signupUser, loginUser, logoutUser, approveUser, rejectUser, createUserByAdmin } = require("../controllers/userController");
const {userAuth}=require("../middleware/auth");
const userRouter=express.Router();

userRouter.post("/signup",signupUser);
userRouter.post("/login",loginUser);
userRouter.post("/logout",logoutUser);
userRouter.post("/create/staff",userAuth,createUserByAdmin)

userRouter.get("/approve/:id",approveUser);
userRouter.get("/reject/:id", rejectUser);

module.exports=userRouter;