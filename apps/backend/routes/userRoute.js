const express = require("express");
const { signupUser, loginUser, logoutUser, approveUser, rejectUser } = require("../controllers/userController");

const userRouter=express.Router();

userRouter.post("/signup",signupUser);
userRouter.post("/login",loginUser);
userRouter.post("/logout",logoutUser);

userRouter.get("/approve/:id",approveUser);
userRouter.get("/reject/:id", rejectUser);

module.exports=userRouter;