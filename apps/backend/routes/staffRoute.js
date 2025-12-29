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
  insertAttribute,
  getAttribute,
  updateSales,
  getCustomerById,
  getAllRental,
  updateRental,
  deleteRental,
  rentalToSales,
  salesToRental,
} = require("../controllers/staffController");
const staffRouter = express.Router();

staffRouter.post("/inventory/sales", userAuth, insertSales);
staffRouter.put("/inventory/sales/:id", userAuth, updateSales); // Assuming this is for updating sales
staffRouter.post("/inventory/rental", userAuth, insertRental);

staffRouter.put("/inventory/rental/:id", userAuth, updateRental); // Assuming this is for updating rental

staffRouter.get("/inventory/sales", userAuth, getAllsales);
staffRouter.get("/inventory/rental", getAllRental);
staffRouter.delete("/inventory/sales/:id", deleteInventory);
staffRouter.delete("/inventory/rental/:id", deleteRental);

staffRouter.post(
  "/inventory/transfer/rental-to-sales",
  userAuth,
  rentalToSales
);

staffRouter.post(
  "/inventory/transfer/sales-to-rental",
  userAuth,
  salesToRental
);

staffRouter.post("/inventory/attributes", userAuth, insertAttribute);
staffRouter.get("/inventory/attributes", getAttribute);

staffRouter.post("/customer/details", userAuth, insertCustomer);
staffRouter.get("/customer/details", getAllCustomers);
staffRouter.delete("/customer/details/:id", userAuth, deleteCustomer);
staffRouter.put("/customer/details/:id", userAuth, editCustomer);
staffRouter.get("/customer/details/:id", userAuth, getCustomerById); // Assuming this is for editing customer details

staffRouter.post("/checkin", userAuth, insertCheckin);
staffRouter.patch("/checkout", userAuth, insertCheckout);
staffRouter.get("/attendance", userAuth, calculateAttendance);

module.exports = staffRouter;
