const { Sales } = require("../models/salesInventory");


const insertSale = async (req, res) => {
  try {
    const { customer, inventory, quantity, totalPrice } = req.body;
    if (!customer || !inventory || !quantity || !totalPrice) {
      return res.status(400).json({
        message: "Please provide all the required fields",
      });
    }
    
    const salesSave = new Sales({
      customer,
      inventory,
      quantity,
      totalPrice,
    });
    await salesSave.save();
    res.status(200).json({
      message: "Sale Created Successfully",
    });
  } catch (error) {
    res.status(400).json({
      message: "Error in inserting Sale",
      error: error.message,
    });
  }
};

module.exports={
    insertSale,
}