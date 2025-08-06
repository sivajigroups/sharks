const express = require("express");
const { userAuth } = require("../middleware/auth");
const {
  insertCustomer,
  getAllCustomers,
  deleteCustomer,
  insertInventory,
  getAllInventory,
  insertCheckin,
  insertCheckout,
  calculateAttendance,
  deleteInventory,
  editCustomer,
  insertSales,
  insertRental,
  getAllsales,
  getAllrental,
  insertAttribute,
  getAttribute,
  updateSales,
} = require("../controllers/staffController");
const staffRouter = express.Router();

staffRouter.post("/inventory/sales",userAuth,insertSales);
staffRouter.put("/inventory/sales/:id", userAuth, updateSales); // Assuming this is for updating sales
staffRouter.post("/inventory/rental", userAuth, insertRental);


staffRouter.get("/inventory/sales",userAuth,getAllsales);
staffRouter.get("/inventory/rental", userAuth, getAllrental);
staffRouter.delete("/inventory/:id",deleteInventory);


staffRouter.post("/inventory/attributes",userAuth,insertAttribute);
staffRouter.get("/inventory/attributes", userAuth, getAttribute);

staffRouter.post("/customer/details", userAuth, insertCustomer);
staffRouter.get("/customer/details", userAuth, getAllCustomers);
staffRouter.delete("/customer/details/:id", userAuth, deleteCustomer);
staffRouter.put("/customer/details/:id", userAuth, editCustomer); // Assuming this is for editing customer details


staffRouter.post("/checkin", userAuth, insertCheckin);
staffRouter.patch("/checkout", userAuth, insertCheckout);
staffRouter.get("/attendance", userAuth, calculateAttendance);

module.exports = staffRouter;
