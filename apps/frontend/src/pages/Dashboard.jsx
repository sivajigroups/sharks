import React from "react";
import { useSelector } from "react-redux";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // optional if you want an action

const Dashboard = () => {
  const user = useSelector((state) => state.auth.user); // string
  const role = useSelector((state) => state.auth.role); // separate
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);

  const dataDash = [
    {
      title: "Total Customers",
      number: 125,
      details: "Active and inactive customers",
    },
    {
      title: "Ongoing Rentals",
      number: 48,
      details: "Currently rented items",
    },
    {
      title: "Available Stock",
      number: 210,
      details: "Items ready for rent",
    },
    {
      title: "Pending Returns",
      number: 12,
      details: "Items due for return",
    },
    {
      title: "Service Requests",
      number: 8,
      details: "Unresolved service issues",
    },
    {
      title: "Total Staff",
      number: 10,
      details: "Admins and staff combined",
    },
  ];

  return (
    <div className="flex flex-wrap gap-4 p-4">
      {dataDash.map((item, index) => (
        <Card key={index} className="w-64 shadow-md">
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.number}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{item.details}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline">View</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default Dashboard;
