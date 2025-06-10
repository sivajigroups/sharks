const express = require("express");
const { userAuth } = require("../middleware/auth");
const {
  insertCustomer,
  getAllCustomers,
  deleteCustomer,
} = require("../controllers/staffController");
const staffRouter = express.Router();
staffRouter.post("/customer/details", userAuth, insertCustomer);
staffRouter.get("/customer/details", userAuth, getAllCustomers);
staffRouter.delete("/customer/details/:id", userAuth, deleteCustomer);

module.exports = staffRouter;
