const { SaleBill } = require("../models/saleBillModel");
const bill = async (req, res) => {
  try {
    const { customerId, totalAmount, paymentMode } = req.body;
    const items = req.body.items || [];

    if (!customerId || !totalAmount || items.length === 0) {
      return res
        .status(400)
        .json({ error: "Customer ID, total amount, and items are required" });
    }

    const newBill = {
      customer: customerId,
      items: items.map((item) => ({
        variant: item.variant,
        quantity: item.quantity,
        price: item.price,
        variantModel: "SalesInventory.variants",
      })),
      totalAmount,
      paymentMode: paymentMode || "Cash",
    };

    const savedBill = await SaleBill.create(newBill);

    res.status(201).json({
      message: "Bill created successfully",
      bill: savedBill,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while creating the bill" });
  }
};

module.exports = { bill };
