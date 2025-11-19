const express=require("express");
const { addingBranch, getAllBranches, getBranchById, deleteBranch, updateBranch, getAllStaff, updateStaff, getStaffById, deleteStaff, purchaseEntry, getAllPurchases, getPurchaseById, updatePurchase, deletePurchase, getAuditLogs } = require("../controllers/adminController");
const { userAuth } = require("../middleware/auth");
const adminRouter=express.Router();



adminRouter.post("/branch/add",userAuth,addingBranch);
adminRouter.get("/branch/all",getAllBranches);
adminRouter.get("/branch/:id",getBranchById);
adminRouter.delete("/branch/:id",deleteBranch);
adminRouter.put("/branch/:id",updateBranch);

adminRouter.get("/staff/details",userAuth,getAllStaff);
adminRouter.put("/staff/details/:id",updateStaff);
adminRouter.get("/staff/details/:id",userAuth ,getStaffById);
adminRouter.delete("/staff/details/:id",userAuth,deleteStaff);

adminRouter.post("/purchases",purchaseEntry);
adminRouter.get("/purchases",getAllPurchases);
adminRouter.get("/purchases/:id",getPurchaseById);
adminRouter.put("/purchases/:id",updatePurchase);
adminRouter.delete("/purchases/:id",deletePurchase);

adminRouter.get("/audit-logs",getAuditLogs);


module.exports=adminRouter;