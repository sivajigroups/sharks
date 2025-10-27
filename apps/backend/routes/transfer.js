const express = require("express");
const transRouter = express.Router();
const transferController = require("../controllers/transferController");

transRouter.post("/transfers/sales", transferController.createSalesTransfer);
transRouter.post("/transfers/rental", transferController.createRentalTransfer);
// (optional) GET history
transRouter.get("/transfers", transferController.getTransfers);

module.exports = transRouter;
