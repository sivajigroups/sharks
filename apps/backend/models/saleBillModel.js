const mongoose = require('mongoose');

const saleBillSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  items: [
    {
      variant: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'items.variantModel', // dynamic reference if using embedded model
      },
      variantModel: {
        type: String,
        required: true,
        enum: ['SalesInventory.variants'],
        default: 'SalesInventory.variants',
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'EMI', 'Others'],
    default: 'Cash',
  },
  billingDate: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const SaleBill = mongoose.model('SaleBill', saleBillSchema);

module.exports = { SaleBill };
