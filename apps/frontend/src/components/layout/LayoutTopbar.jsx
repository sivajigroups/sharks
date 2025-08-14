import React from "react";
import { Bell, Settings, Users, Languages } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { logout } from "@/redux/authSlice";

const LayoutTopbar = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const role = useSelector((state) => state.auth.role) || "";
  const branch = useSelector((state) => state.auth.branch) || "";

  const handleLogout = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/logout`,
        { method: "POST", credentials: "include" }
      );
      if (!res.ok) throw new Error("Logout failed");
      dispatch(logout());
      navigate("/");
    } catch (err) {
      console.error(err.message);
    }
  };

  return (
    <header className="w-full h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b shadow">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <span className="text-lg font-semibold">Sivaji-Groups</span>
      </div>

      <div className="flex items-center gap-6">
        {role.toLowerCase() === "staff" && <p>{branch?.name || "No Branch"}</p>}

        {role.toLowerCase() === "admin" && (
          <>
            {/* <Bell className="w-5 h-5 text-red-600" title="Notifications" />
            <Settings className="w-5 h-5 text-gray-600" title="Settings" /> */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 p-2">
                  <Languages className="w-4 h-4" />
                  {/* <span>{i18n.language === "en" ? "தமிழ்" : "English"}</span> */}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => i18n.changeLanguage("en")}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => i18n.changeLanguage("ta")}>
                  தமிழ்
                </DropdownMenuItem>

                <DropdownMenuSeparator />
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {role.toLowerCase() === "staff" && (
          <Users className="w-5 h-5 text-blue-600" title="Staff Panel" />
        )}

        <span className="font-medium">{role.toUpperCase()}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
