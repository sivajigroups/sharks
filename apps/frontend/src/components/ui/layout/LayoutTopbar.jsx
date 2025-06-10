import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Settings, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSelector, useDispatch } from "react-redux";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { logout } from "@/redux/authSlice"; // your logout redux action

const LayoutTopbar = () => {
  const role = useSelector((state) => state.auth.role) || "";
  const branch = useSelector((state) => state.auth.branch) || "";
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) throw new Error("Logout failed");

      dispatch(logout());
      navigate("/");
    } catch (err) {
      console.error(err.message);
      // optionally show toast or error message here
    }
  };

  return (
    <header className="w-full h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b shadow">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <span className="text-lg font-semibold">Dashboard</span>
      </div>

      <div className="flex items-center gap-6">
        <p>{branch}</p>
        {role.toLowerCase() === "admin" && (
          <>
            <Bell className="w-5 h-5 text-red-600" title="Notifications" />
            <Settings className="w-5 h-5 text-gray-600" title="Settings" />
          </>
        )}

        {role.toLowerCase() === "staff" && (
          <>
            <Users className="w-5 h-5 text-blue-600" title="Staff Panel" />
          </>
        )}

        <span className="font-medium">{role.toUpperCase()}</span>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="cursor-pointer">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default LayoutTopbar;
