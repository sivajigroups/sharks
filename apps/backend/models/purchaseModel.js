const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    vendorName: { type: String, required: true, trim: true },
    billNumber: { type: String, trim: true },
    billDate: { type: Date, default: Date.now },
    items: { type: [itemSchema], required: true },
    totalQuantity: { type: Number, default: 0 },
    subTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

purchaseSchema.pre("validate", function (next) {
  if (Array.isArray(this.items)) {
    this.items = this.items.map((i) => ({
      ...i,
      amount: Number(i.quantity || 0) * Number(i.rate || 0),
    }));
    this.totalQuantity = this.items.reduce((a, b) => a + (b.quantity || 0), 0);
    this.subTotal = this.items.reduce((a, b) => a + (b.amount || 0), 0);
  }
  next();
});

module.exports = mongoose.model("Purchase", purchaseSchema);
