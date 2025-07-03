const express = require("express");
const { signupUser, loginUser, logoutUser, approveUser, rejectUser, createUserByAdmin, signupUserByAdmin, deleteStaffByAdmin } = require("../controllers/userController");
const {userAuth}=require("../middleware/auth");
const userRouter=express.Router();

userRouter.post("/signup",signupUser);
userRouter.post("/signup/admin", signupUserByAdmin); // Admin can create users
userRouter.post("/login",loginUser);
userRouter.post("/logout",logoutUser);

userRouter.post("/create/staff",userAuth,createUserByAdmin)
userRouter.delete("/delete/staff/:id",userAuth,deleteStaffByAdmin);

userRouter.get("/approve/:id",approveUser);
userRouter.get("/reject/:id", rejectUser);

module.exports=userRouter;