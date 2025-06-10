import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import LayoutSidebar from "./LayoutSidebar";
import LayoutTopbar from "./LayoutTopbar";
import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        {/* Sidebar on the left */}
        <LayoutSidebar />

        {/* Right side (Topbar + content) */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <LayoutTopbar />
          <main className="flex-1 p-4 bg-gray-100 dark:bg-gray-900 overflow-auto">
            <Outlet/>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
