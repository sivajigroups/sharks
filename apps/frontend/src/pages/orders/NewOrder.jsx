import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

const NewOrder = () => {
  const [customers, setCustomers] = useState([]);
  const [tools, setTools] = useState([]);
  const [selectedToolId, setSelectedToolId] = useState("");
  const [toolDetails, setToolDetails] = useState({});
  const [customerSearch, setCustomerSearch] = useState("");
  const [toolSearch, setToolSearch] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [pendingAmount, setPendingAmount] = useState("");

  const filteredCustomers = customers.filter((c) =>
    `${c.name} ${c.phone}`.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredTools = tools.filter(
    (t) =>
      `${t.name} ${t.barcode}`
        .toLowerCase()
        .includes(toolSearch.toLowerCase()) && t.type === "rental"
  );

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("https://api.sivajigroups.com/api/customer/details", {
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

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await fetch("https://api.sivajigroups.com/api/inventory", {
          credentials: "include",
        });
        const data = await res.json();
        if (Array.isArray(data.data)) {
          setTools(data.data);
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
      type: "rental",
      toolId: selectedToolId,
      quantity,
      rental: {
        startDate,
        endDate,
        ratePerDay: toolDetails.pricePerDay,
      },
      payment: {
        status: paymentStatus,
        pendingAmount,
      },
    };

    const res = await fetch("https://api.sivajigroups.com/api/transaction", {
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
    <div className="max-w-7xl mx-auto p-4 space-y-4 w-309">
      <h1 className="text-xl font-bold">New Rental Order</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Customer Selection */}
        <div className="relative col-span-1">
          <Label className="py-3">Customer</Label>
          <Input
            type="text"
            placeholder="Search Customer (name or phone)"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />
          {customerSearch && (
            <div className="absolute z-10 bg-white border w-full max-h-48 overflow-y-auto shadow-lg">
              {filteredCustomers.map((c) => (
                <div
                  key={c._id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setCustomerId(c._id);
                    setCustomerSearch(`${c.name} (${c.phone})`);
                  }}
                >
                  {c.name} ({c.phone})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tool Selection */}
        <div className="relative col-span-1">
          <Label className="py-3">Tool</Label>
          <Input
            type="text"
            placeholder="Search Tool (name or barcode)"
            value={toolSearch}
            onChange={(e) => setToolSearch(e.target.value)}
          />
          {toolSearch && (
            <div className="absolute z-10 bg-white border w-full max-h-48 overflow-y-auto shadow-lg">
              {filteredTools.map((t) => (
                <div
                  key={t._id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setSelectedToolId(t._id);
                    setToolSearch(`${t.name} (${t.barcode})`);
                  }}
                >
                  {t.name} ({t.barcode}) - {t.category}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tool Details */}
        {toolDetails && selectedToolId && (
          <>
            <div className="col-span-1">
              <Label className="py-3">Tool Code</Label>
              <Input readOnly value={toolDetails.barcode || ""} />
            </div>
            <div className="col-span-1">
              <Label className="py-3">Rate Per Day</Label>
              <Input readOnly value={toolDetails.pricePerDay || ""} />
            </div>
          </>
        )}

        {/* Rental Period */}
        <div className="col-span-1">
          <Label className="py-3">Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="col-span-1">
          <Label className="py-3">End Date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        {/* Quantity */}
        <div className="col-span-1">
          <Label className="py-3">Quantity</Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        {/* Payment Info */}
        <div className="col-span-1">
          <Label className="py-3">Payment Status</Label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="w-full border p-2 rounded-md"
          >
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        <div className="col-span-1">
          <Label className="py-3">Pending Amount</Label>
          <Input
            value={pendingAmount}
            onChange={(e) => setPendingAmount(e.target.value)}
          />
        </div>
      </div>

      <Button className="w-50 mt-4" onClick={handleSubmit}>
        Submit
      </Button>
    </div>
  );
};

export default NewOrder;
