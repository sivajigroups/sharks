const express=require("express");
const { addingBranch, getAllBranches, getBranchById, deleteBranch, updateBranch, getAllStaff, updateStaff } = require("../controllers/adminController");
const { userAuth } = require("../middleware/auth");
const adminRouter=express.Router();



adminRouter.post("/branch/details",userAuth,addingBranch);
adminRouter.get("/branch/all",getAllBranches);
adminRouter.get("/branch/:id",userAuth,getBranchById);
adminRouter.delete("/branch/:id",userAuth,deleteBranch);
adminRouter.patch("/branch/:id",updateBranch);

adminRouter.get("/staff/details",userAuth,getAllStaff);
adminRouter.patch("/staff/details/:id",updateStaff);

module.exports=adminRouter;