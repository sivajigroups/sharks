const { Customer } = require("../models/customerModel");

const insertCustomer = async (req, res) => {
  try {
    const { name, phone, address, idProofType } = req.body;

    if (!name || !phone || !address || !idProofType) {
      return res.status(400).json({
        message: "Please fill all the fields",
      });
    }

    const existingUser = await Customer.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({ message: "Customer already registered." });
    }

    const customerSave = new Customer({
      name,
      phone,
      address,
      idProofType,
    });

    await customerSave.save();

    res.json("Customer Added Successfully");
  } catch (error) {
    res.status(400).json({
      message: "Error in adding Customer",
      error: error.message,
    });
  }
};


const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching customers", error: error.message });
  }
};
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await Customer.findByIdAndDelete(id);
    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error deleting customer", error: error.message });
  }
};

module.exports={
    getAllCustomers,
    insertCustomer,
    deleteCustomer
}