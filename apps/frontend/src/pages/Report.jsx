import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const chartData = [
  { month: "Jan", rentals: 40, returns: 30 },
  { month: "Feb", rentals: 55, returns: 40 },
  { month: "Mar", rentals: 68, returns: 52 },
  { month: "Apr", rentals: 49, returns: 39 },
  { month: "May", rentals: 74, returns: 60 },
  { month: "Jun", rentals: 62, returns: 47 },
];

const reportData = [
  {
    title: "Total Customers",
    value: 125,
    description: "Active and inactive customers",
  },
  {
    title: "Ongoing Rentals",
    value: 48,
    description: "Currently rented items",
  },
  {
    title: "Available Stock",
    value: 210,
    description: "Items ready for rent",
  },
  {
    title: "Pending Returns",
    value: 12,
    description: "Items due for return",
  },
  {
    title: "Service Requests",
    value: 8,
    description: "Unresolved service issues",
  },
  {
    title: "Total Staff",
    value: 10,
    description: "Admins and staff combined",
  },
];

const chartConfig = {
  rentals: {
    label: "Rentals",
    color: "#22c55e", // green-500
  },
  returns: {
    label: "Returns",
    color: "#3b82f6", // blue-500
  },
};

const Report = () => {
  return (
    <div className="p-6 space-y-10">
      {/* Summary Cards */}
      <div className="flex flex-wrap gap-4">
        {reportData.map((item, index) => (
          <Card key={index} className="w-64 shadow-md">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rentals vs Returns Chart */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="rentals"
              name={chartConfig.rentals.label}
              fill={chartConfig.rentals.color}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="returns"
              name={chartConfig.returns.label}
              fill={chartConfig.returns.color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Report;
