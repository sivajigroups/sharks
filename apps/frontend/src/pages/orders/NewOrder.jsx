import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const NewOrder = ({ type = "rental" }) => {
  const [customers, setCustomers] = useState([]);
  const [tools, setTools] = useState([]);
  const [selectedToolId, setSelectedToolId] = useState("");
  const [toolDetails, setToolDetails] = useState({});

  const [customerId, setCustomerId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [pendingAmount, setPendingAmount] = useState("");
  const [followUp, setFollowUp] = useState({
    nextDate: "",
    purpose: "",
    reasonInactive: "",
    remarks: "",
  });

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/customer/details", {
          credentials: "include",
        });
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
        setCustomers([]);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch tools
useEffect(() => {
  const fetchTools = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/inventory", {
        credentials: "include",
      });
      const data = await res.json();

      if (Array.isArray(data.data)) {
        setTools(data.data); // ✅ set array inside `data`
      } else {
        console.error("Inventory API did not return a valid data array:", data);
        setTools([]);
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      setTools([]);
    }
  };
  fetchTools();
}, []);


  // When tool is selected, set details
  useEffect(() => {
    const tool = tools.find((t) => t._id === selectedToolId);
    if (tool) setToolDetails(tool);
  }, [selectedToolId, tools]);

  const handleSubmit = async () => {
    if (!customerId || !selectedToolId) {
      toast.error("Please select both customer and tool.");
      return;
    }

    const body = {
      customerId,
      type,
      toolId: selectedToolId,
      quantity,
      rental:
        type === "rental"
          ? {
              startDate,
              endDate,
              ratePerDay: toolDetails.pricePerDay,
            }
          : undefined,
      purchase:
        type === "purchase"
          ? {
              date: purchaseDate,
              price: toolDetails.salePrice,
            }
          : undefined,
      payment: {
        status: paymentStatus,
        pendingAmount,
      },
      followUp,
    };

    const res = await fetch("http://localhost:4000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Order saved successfully!");
    } else {
      const err = await res.json();
      toast.error("Failed: " + err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">New {type} Order</h1>

      {/* Customer Selection */}
      <select
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        className="w-full border p-2"
      >
        <option value="">Select Customer</option>
        {customers.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name} ({c.phone})
          </option>
        ))}
      </select>

      {/* Tool Selection */}
      <select
        value={selectedToolId}
        onChange={(e) => setSelectedToolId(e.target.value)}
        className="w-full border p-2"
      >
        <option value="">Select Tool</option>
        {Array.isArray(tools) &&
          tools
            .filter((t) => t.type === type)
            .map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.barcode}) - {t.category}
              </option>
            ))}
      </select>

      {/* Auto-Filled Fields */}
      {toolDetails && selectedToolId && (
        <>
          <Input readOnly value={toolDetails.barcode || ""} placeholder="Tool Code" />
          <Input readOnly value={toolDetails.brand || ""} placeholder="Brand" />
          {type === "rental" && (
            <Input readOnly value={toolDetails.pricePerDay || ""} placeholder="Rate Per Day" />
          )}
          {type === "purchase" && (
            <Input readOnly value={toolDetails.salePrice || ""} placeholder="Sale Price" />
          )}
        </>
      )}

      <Input
        placeholder="Quantity"
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />

      {type === "rental" && (
        <>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </>
      )}

      {type === "purchase" && (
        <Input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
        />
      )}

      {/* Payment Info */}
      <select
        value={paymentStatus}
        onChange={(e) => setPaymentStatus(e.target.value)}
        className="w-full border p-2"
      >
        <option value="Paid">Paid</option>
        <option value="Partial">Partial</option>
        <option value="Pending">Pending</option>
      </select>

      <Input
        placeholder="Pending Amount"
        value={pendingAmount}
        onChange={(e) => setPendingAmount(e.target.value)}
      />

      {/* Follow-Up Info */}
      <Input
        type="date"
        placeholder="Next Follow-up Date"
        value={followUp.nextDate}
        onChange={(e) =>
          setFollowUp({ ...followUp, nextDate: e.target.value })
        }
      />
      <Input
        placeholder="Purpose"
        value={followUp.purpose}
        onChange={(e) =>
          setFollowUp({ ...followUp, purpose: e.target.value })
        }
      />
      <Input
        placeholder="Reason for Inactivity"
        value={followUp.reasonInactive}
        onChange={(e) =>
          setFollowUp({ ...followUp, reasonInactive: e.target.value })
        }
      />
      <Input
        placeholder="Remarks"
        value={followUp.remarks}
        onChange={(e) =>
          setFollowUp({ ...followUp, remarks: e.target.value })
        }
      />

      <Button className="w-full" onClick={handleSubmit}>
        Submit
      </Button>
    </div>
  );
};

export default NewOrder;
