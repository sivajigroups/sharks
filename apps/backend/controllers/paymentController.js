const { SaleBill } = require("../models/saleBillModel");
const RentalPurchase = require("../models/rentalTransactionModel");
const { CombinedBill } = require("../models/combinedBillModel");

// Helper to update bill payment
const updateBillPayment = async (bill, amount) => {
  bill.paidAmount = (bill.paidAmount || 0) + amount;
  bill.balanceAmount = bill.totalAmount - bill.paidAmount;

  if (bill.balanceAmount <= 0) {
    bill.balanceAmount = 0;
    bill.paymentStatus = "Paid";
  } else {
    bill.paymentStatus = "Partial";
  }
  await bill.save();
};

const collectCustomerPayment = async (req, res) => {
  try {
    const { customerId, amount } = req.body;
    let remainingAmount = Number(amount);

    if (!customerId || remainingAmount <= 0) {
      return res.status(400).json({ message: "Invalid customer or amount" });
    }

    // 1. Fetch all pending bills for customer
    const sales = await SaleBill.find({
      customer: customerId,
      paymentStatus: { $ne: "Paid" },
    }).sort({ createdAt: 1 });

    const rentals = await RentalPurchase.find({
      customer: customerId,
      paymentStatus: { $ne: "Paid" },
    }).sort({ createdAt: 1 });

    const combined = await CombinedBill.find({
      customer: customerId,
      paymentStatus: { $ne: "Paid" },
    }).sort({ createdAt: 1 });

    // Merge and sort by date
    let allBills = [...sales, ...rentals, ...combined].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );

    const paidBills = [];

    for (const bill of allBills) {
      if (remainingAmount <= 0) break;

      const pending = bill.totalAmount - (bill.paidAmount || 0);
      if (pending <= 0) continue;

      const pay = Math.min(pending, remainingAmount);
      await updateBillPayment(bill, pay);

      remainingAmount -= pay;
      paidBills.push({
        billNo: bill.billNo,
        paid: pay,
        status: bill.paymentStatus,
      });
    }

    res.status(200).json({
      message: "Payment processed",
      remainingCredit: remainingAmount,
      transactions: paidBills,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { collectCustomerPayment };
