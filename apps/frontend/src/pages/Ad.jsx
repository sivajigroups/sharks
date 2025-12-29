import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/redux/authSlice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

const Ad = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const role = useSelector((state) => state.auth.role);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const quickActions = [
    {
      title: "Dashboard",
      description: "View overview and analytics",
      icon: LayoutDashboard,
      path: "/layout/dashboard",
      color: "text-blue-600",
    },
    {
      title: "Inventory",
      description: "Manage sales & rental stock",
      icon: Package,
      path: "/layout/salesInfo",
      color: "text-green-600",
    },
    {
      title: "Customers",
      description: "View and manage customers",
      icon: Users,
      path: "/layout/customers",
      color: "text-purple-600",
    },
    {
      title: "Billing",
      description: "Create new bills and orders",
      icon: ShoppingCart,
      path: "/layout/billing",
      color: "text-orange-600",
    },
    {
      title: "Orders",
      description: "View order history",
      icon: FileText,
      path: "/layout/order",
      color: "text-red-600",
    },
    {
      title: "Settings",
      description: "Branches, staff & more",
      icon: Settings,
      path: "/layout/branches",
      color: "text-gray-600",
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 w-full h-full overflow-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-black mb-1">
            Welcome to Sivaji Power Tools
          </h1>
          <p className="text-sm text-gray-600">
            {user ? `Logged in as ${user}` : "Ready to manage your business"}
            {role && ` • ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </p>
        </div>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Welcome Card */}
      <Card className="bg-gradient-to-br from-black to-gray-800 text-white border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Get Started</CardTitle>
          <CardDescription className="text-gray-300">
            Choose a quick action to begin managing your operations
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Actions Grid */}
      <div className="flex flex-wrap gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card
              key={index}
              className="w-64 shadow-md cursor-pointer hover:shadow-xl transition-all duration-200"
              onClick={() => navigate(action.path)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <CardTitle className="text-base">{action.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{action.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <p className="text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Sivaji Power Tools · Internal Management
          System
        </p>
      </div>
    </div>
  );
};

export default Ad;
