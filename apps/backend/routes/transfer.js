const express = require("express");
const transRouter = express.Router();
const transferController = require("../controllers/transferController");

// POST /api/transfers
transRouter.post("/transfers",transferController.createTransfer);

// (optional) GET history
transRouter.get("/transfers", transferController.getTransfers);

module.exports = transRouter;
