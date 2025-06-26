const { Transaction } = require("../models/transactionModel");

const rentalsTransaction = async (req, res) => {
  try {
    const { customer, inventory, rentDate, returnDate, amount, status } = req.body;

    if (!customer || !inventory || !rentDate || !returnDate || !amount || !status) {
      return res.status(400).json({
        message: "Please provide all the required fields",
      });
    }

    const rentalsave = new Transaction({
      customer,
      inventory,
      rentDate,
      returnDate,
      amount,
      status,
    });

    await rentalsave.save();

    res.status(200).json({
      message: "Rental Created Successfully",
      transaction: rentalsave,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error in rental",
      error: error.message,
    });
  }
};

module.exports = { rentalsTransaction };
