const express=require("express");
const { addingBranch, getAllBranches, getBranchById, deleteBranch, updateBranch } = require("../controllers/adminController");
const { userAuth } = require("../middleware/auth");
const adminRouter=express.Router();



adminRouter.post("/branch/details",userAuth,addingBranch);
adminRouter.get("/branch/all",userAuth,getAllBranches);
adminRouter.get("/branch/:id",userAuth,getBranchById);
adminRouter.delete("/branch/:id",userAuth,deleteBranch);
adminRouter.patch("/branch/:id",updateBranch);

module.exports=adminRouter;