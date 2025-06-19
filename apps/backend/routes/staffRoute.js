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
} = require("../controllers/staffController");
const staffRouter = express.Router();

staffRouter.post("/inventory",userAuth,insertInventory);
staffRouter.get("/inventory",userAuth,getAllInventory);
staffRouter.delete("/inventory/:id",deleteInventory);

staffRouter.post("/customer/details", userAuth, insertCustomer);
staffRouter.get("/customer/details", userAuth, getAllCustomers);
staffRouter.delete("/customer/details/:id", userAuth, deleteCustomer);
staffRouter.put("/customer/details/:id", userAuth, editCustomer); // Assuming this is for editing customer details


staffRouter.post("/checkin", userAuth, insertCheckin);
staffRouter.patch("/checkout", userAuth, insertCheckout);
staffRouter.get("/attendance", userAuth, calculateAttendance);

module.exports = staffRouter;
