const express=require("express");
const { addingBranch, getAllBranches, getBranchById, deleteBranch, updateBranch, getAllStaff, updateStaff, getStaffById, deleteStaff } = require("../controllers/adminController");
const { userAuth } = require("../middleware/auth");
const adminRouter=express.Router();



adminRouter.post("/branch/add",userAuth,addingBranch);
adminRouter.get("/branch/all",getAllBranches);
adminRouter.get("/branch/:id",userAuth,getBranchById);
adminRouter.delete("/branch/:id",userAuth,deleteBranch);
adminRouter.put("/branch/:id",updateBranch);

adminRouter.get("/staff/details",userAuth,getAllStaff);
adminRouter.put("/staff/details/:id",updateStaff);
adminRouter.get("/staff/details/:id",userAuth ,getStaffById);
adminRouter.delete("/staff/details/:id",userAuth,deleteStaff);

module.exports=adminRouter;