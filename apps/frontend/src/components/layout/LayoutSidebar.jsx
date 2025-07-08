import React from "react";
import { useSelector } from "react-redux";
import {
  Home,
  Boxes,
  ShoppingCart,
  Wrench,
  FileText,
  Users,
  Building,
  CheckSquare,
  Settings,
  BarChart2,
  MessageCircle,
  UserRoundPen,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";

const LayoutSidebar = () => {
  const role = useSelector((state) => state.auth.role); // get role from redux

  const adminSidebar = [
    {
      label: "General",
      items: [
        { title: "Dashboard", icon: Home, url: "/layout/dashboard" },
        // { title: "Reports", icon: BarChart2, url: "/layout/report" },
        // {
        //   title: "Notifications",
        //   icon: MessageCircle,
        //   url: "/layout/notification",
        // },
      ],
    },
    {
      label: "Inventory",
      items: [
        {
          title: "Sales Inventory",
          icon: ShoppingCart,
          url: "/layout/salesInfo",
        },
        // { title: "Rental Inventory", icon: Boxes, url: "/layout/rentalInfo" },
        // {
        //   title: "Service Inventory",
        //   icon: Wrench,
        //   url: "/layout/serviceInfo",
        // },
      ],
    },
    // {
    //   label: "Orders",
    //   items: [
    //     { title: "Rental Orders", icon: FileText, url: "/layout/rentalOrder/new" },
    //     { title: "Sales Orders", icon: FileText, url: "/layout/salesOrder" },
    //     {
    //       title: "Service Orders",
    //       icon: FileText,
    //       url: "/layout/serviceOrder",
    //     },
    //   ],
    // },
    {
      label: "Management",
      items: [
        { title: "Customers", icon: Users, url: "/layout/customers" },
        // { title: "Branches", icon: Building, url: "/layout/branches" },
        // { title: "Tool Transfers", icon: Wrench, url: "#" },
      ],
    },
    {
      label: "Administration",
      items: [{ title: "Profile", icon: UserRoundPen, url: "/layout/users" }],
    },
  ];

  const staffSidebar = [
    {
      label: "Quick Actions",
      items: [
        { title: "Dashboard", icon: Home, url: "/layout/dashboard" },
        { title: "Rentals", icon: FileText, url: "#" },
        { title: "Returns", icon: FileText, url: "#" },
        { title: "Sales", icon: ShoppingCart, url: "#" },
        { title: "Service", icon: Wrench, url: "#" },
      ],
    },
    {
      label: "Operations",
      items: [
        { title: "Attendance", icon: CheckSquare, url: "#" },
        { title: "Shop Open/Close", icon: Building, url: "#" },
      ],
    },
    {
      label: "Customers",
      items: [
        { title: "Customer List", icon: Users, url: "/layout/customers" },
      ],
    },
  ];

  const sidebarToRender = adminSidebar;

  return (
    <Sidebar>
      <SidebarContent>
        {sidebarToRender.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link to={item.url}>
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                      {/* <a href={item.url}>
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </a> */}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};

export default LayoutSidebar;
