import jsPDF from "jspdf";

/**
 * Generates a thermal-printer friendly PDF bill (80mm width).
 * @param {Object} params - Bill generation parameters
 * @param {string} params.billNo - The bill/order number
 * @param {string} params.modeTitle - Wrapper title e.g. "Sale Bill", "Rental Order"
 * @param {Object} params.customer - Customer object { name, phone, address: { city, ... } }
 * @param {Array} params.items - Array of items { name, qty, price, itemType, ... }
 * @param {number} params.saleSubtotal - Subtotal for sale items
 * @param {number} params.rentalSubtotal - Subtotal for rental items
 * @param {number} params.subtotal - Combined subtotal
 * @param {number} params.taxAmount - Tax amount
 * @param {number} params.totalAmount - Final total amount
 * @param {string} params.paymentMode - Payment mode (UPI, Cash, etc.)
 * @param {string} params.paymentStatus - Payment status (Paid, Pending)
 * @param {number} [params.rentalDeposit] - Rental deposit amount
 * @param {number} [params.discount] - Discount amount
 * @param {string} [params.date] - Bill date ISO string or Date object
 */
export function generateBillPDF({
  billNo,
  modeTitle,
  customer,
  items,
  saleSubtotal = 0,
  rentalSubtotal = 0,
  subtotal = 0,
  taxAmount = 0,
  totalAmount = 0,
  paymentMode,
  paymentStatus,
  rentalDeposit = 0,
  discount = 0,
  date = new Date(),
}) {
  // Thermal printer config (80mm width) ~ 3.15 inches
  // Calculate dynamic height based on content
  // Base height (Header + Footer + Totals) + Items
  const estimatedHeight = 150 + items.length * 15;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, Math.max(200, estimatedHeight)],
  });

  const pageWidth = 80;
  const marginLeft = 4;
  const marginRight = 76; // 80 - 4
  const centerX = pageWidth / 2;

  let currentY = 10;

  // --- HEADER ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Sivaji Power Tools", centerX, currentY, { align: "center" });
  currentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Power Tools • Rentals • Services", centerX, currentY, {
    align: "center",
  });
  currentY += 5;

  // Divider
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.line(marginLeft, currentY, marginRight, currentY);
  currentY += 5;

  // --- TITLE ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(modeTitle, centerX, currentY, { align: "center" });
  currentY += 5;

  // --- BILL INFO ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Bill No: ${billNo}`, marginLeft, currentY);
  currentY += 4;

  const dateObj = new Date(date);
  doc.text(
    `Date: ${dateObj.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    marginLeft,
    currentY,
  );
  currentY += 4;
  if (paymentMode) {
    doc.text(`Mode: ${paymentMode}`, marginLeft, currentY);
    currentY += 4;
  }
  doc.text(`Status: ${paymentStatus || "Paid"}`, marginLeft, currentY);
  currentY += 6;

  // --- CUSTOMER INFO ---
  doc.setFont("helvetica", "bold");
  doc.text("Customer:", marginLeft, currentY);
  currentY += 4;

  doc.setFont("helvetica", "normal");
  const customerName = customer?.name || "Guest";
  const customerPhone = customer?.phone ? `Ph: ${customer.phone}` : "";

  // Handle address object or string
  let city = "";
  if (customer?.address) {
    if (typeof customer.address === "string") {
      // Try to extract city roughly or just print nothing if too long
      city = "";
    } else {
      city = customer.address.city || "";
    }
  }

  doc.text(customerName, marginLeft, currentY);
  if (city) {
    doc.text(city, marginRight, currentY, { align: "right" });
  }
  currentY += 4;

  if (customerPhone) {
    doc.text(customerPhone, marginLeft, currentY);
    currentY += 4;
  }

  currentY += 2;
  doc.line(marginLeft, currentY, marginRight, currentY);
  currentY += 5;

  // --- ITEMS TABLE HEADERS ---
  const colX = [marginLeft, marginLeft + 46, marginRight]; // Item, Qty (center), Amt (right)

  doc.setFont("helvetica", "bold");
  doc.text("Item", colX[0], currentY);
  doc.text("Qty", colX[1], currentY, { align: "center" });
  doc.text("Amt", colX[2], currentY, { align: "right" });
  currentY += 4;
  doc.setLineWidth(0.2);
  doc.line(marginLeft, currentY, marginRight, currentY);
  currentY += 3;

  // --- ITEMS LIST ---
  doc.setFont("helvetica", "normal");

  items.forEach((item) => {
    // 1. Details string (dates etc)
    let details = "";
    if (item.itemType === "rental") {
      const rentDate =
        item.rentDate || item.fromDate
          ? new Date(item.rentDate || item.fromDate).toLocaleDateString()
          : "";

      const days = item.days || 1;
      const price = item.pricePerDay || 0;
      details = `[RENTAL] ${days}d (${rentDate}) @ ${price}/day`;
    }

    // 2. Split item name to fit width
    const maxItemWidth = 42;
    const itemName = item.name || item.itemName || item.productName || "Item";
    const nameLines = doc.splitTextToSize(itemName, maxItemWidth);

    // 3. Draw Name
    doc.text(nameLines, colX[0], currentY);

    // 4. Draw Qty (Centered)
    const qty = item.qty || item.quantity || 0;
    doc.text(String(qty), colX[1], currentY, { align: "center" });

    // 5. Draw Amount (Right)
    let amount = 0;
    if (item.amount) {
      amount = item.amount;
    } else if (item.itemType === "rental") {
      amount = qty * (item.days || 1) * (item.pricePerDay || 0);
    } else {
      amount = qty * (item.price || item.unitPrice || 0);
    }

    doc.text(amount.toFixed(2), colX[2], currentY, { align: "right" });

    // Calculate new Y
    const lineHeight = 4;
    currentY += Math.max(lineHeight, nameLines.length * lineHeight);

    // 6. Draw details if any
    if (details) {
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(details, colX[0], currentY - 1);
      doc.setFontSize(8);
      doc.setTextColor(0);
      currentY += 3;
    }

    currentY += 1;
  });

  doc.line(marginLeft, currentY, marginRight, currentY);
  currentY += 5;

  // --- TOTALS ---
  const totalsLabelX = 45;

  // Show breakdown if mixed items or if explicitly requested via separate subtotals
  const hasSale = items.some((i) => i.itemType === "sale") || saleSubtotal > 0;
  const hasRental =
    items.some((i) => i.itemType === "rental") || rentalSubtotal > 0;

  if (hasSale && hasRental) {
    doc.setFontSize(7);
    doc.text("Sale Subtotal:", totalsLabelX, currentY);
    doc.text(Number(saleSubtotal).toFixed(2), marginRight, currentY, {
      align: "right",
    });
    currentY += 3;
    doc.text("Rental Subtotal:", totalsLabelX, currentY);
    doc.text(Number(rentalSubtotal).toFixed(2), marginRight, currentY, {
      align: "right",
    });
    currentY += 4;
    doc.setFontSize(8);
  }

  doc.text("Subtotal:", totalsLabelX, currentY);
  doc.text(Number(subtotal).toFixed(2), marginRight, currentY, {
    align: "right",
  });
  currentY += 4;

  if (rentalDeposit > 0) {
    doc.text("Deposit:", totalsLabelX, currentY);
    doc.text(Number(rentalDeposit).toFixed(2), marginRight, currentY, {
      align: "right",
    });
    currentY += 4;
  }

  if (discount > 0) {
    doc.text("Discount:", totalsLabelX, currentY);
    doc.text(`-${Number(discount).toFixed(2)}`, marginRight, currentY, {
      align: "right",
    });
    currentY += 4;
  }

  doc.text("Tax (13%):", totalsLabelX, currentY);
  doc.text(Number(taxAmount).toFixed(2), marginRight, currentY, {
    align: "right",
  });
  currentY += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL:", totalsLabelX, currentY);
  doc.text(`Rs. ${Number(totalAmount).toFixed(2)}`, marginRight, currentY, {
    align: "right",
  });
  currentY += 8;

  // --- FOOTER ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Thank you for your business!", centerX, currentY, {
    align: "center",
  });

  doc.save(`${billNo}.pdf`);
}
