import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Home,
  ShoppingCart,
  Users,
  UserRoundPen,
  Wrench,
  History,
  ListOrdered,
  DollarSign,
  ChevronDown,
  ChevronRight,
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

const LayoutSidebar = () => {
  const { t } = useTranslation();
  const role = useSelector((state) => state.auth.role);
  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // 💡 Environment check
  const RENTAL_ENABLED = import.meta.env.VITE_RENTAL_TRUE === "true";

  // ── Common / Base Sidebar
  const baseSidebar = [
    // {
    //   label: t("sidebar.general"),
    //   items: [
    //     { title: t("sidebar.dashboard"), icon: Home, url: "/layout/dashboard" },
    //   ],
    // },
  ];

  // ── Admin Sidebar
  const adminSidebar = [
    ...baseSidebar,
    {
      label: t("sidebar.management"),
      items: [
        {
          title: t("sidebar.salesInventory"),
          icon: Wrench,
          url: "/layout/salesInfo",
        },
        // 💡 show rental inventory only if enabled
        ...(RENTAL_ENABLED
          ? [
              {
                title: t("sidebar.rentalInventory"),
                icon: Wrench,
                url: "/layout/rentalInfo",
              },
            ]
          : []),
        {
          title: t("sidebar.customers"),
          icon: Users,
          url: "/layout/customers",
        },
      ],
    },
    {
      label: t("sidebar.Billing"),
      items: [
        {
          title: t("sidebar.sales"),
          icon: ShoppingCart,
          url: "/layout/billing",
        },
        { title: "Order List", icon: ListOrdered, url: "/layout/order" },
        // 💡 show rental orders only if enabled
        ...(RENTAL_ENABLED
          ? [
              {
                title: t("sidebar.rentalOrders"),
                icon: ListOrdered,
                url: "/layout/rentalOrderList",
              },
            ]
          : []),
      ],
    },
    {
      label: t("sidebar.reports"),
      items: [
        {
          title: t("sidebar.inventoryReport"),
          icon: Wrench,
          url: "/layout/salesInventoryReport",
        },
        {
          title: t("sidebar.inactiveCustomers"),
          icon: Users,
          url: "/layout/customers/inactive",
        },
      ],
    },
    {
      label: t("sidebar.administration"),
      items: [
        {
          title: t("sidebar.profile"),
          icon: UserRoundPen,
          url: "/layout/users",
        },
        {
          title:t("sidebar.BarcodeGenerator"),
          icon: ShoppingCart,
          url: "/layout/barcodes",

        },
        {
          title: t("sidebar.Branches"),
          icon: DollarSign,
          url: "/layout/branches",
        },
        {
          title: t("sidebar.purchaseOrder"),
          icon: ShoppingCart,
          url: "/layout/purchaseOrder",
        },
         {
        title: "Audit Logs",
        icon: History,
        url: "/layout/audit-logs",
      },
      ],
    },
  ];

  // ── Staff Sidebar
  const staffSidebar = [
    ...baseSidebar,
    {
      label: t("sidebar.Billing"),
      items: [
        {
          title: t("sidebar.sales"),
          icon: ShoppingCart,
          url: "/layout/billing",
        },
        { title: "Order List", icon: ListOrdered, url: "/layout/order" },
        ...(RENTAL_ENABLED
          ? [
              {
                title: t("sidebar.rentalOrders"),
                icon: ListOrdered,
                url: "/layout/rentalOrderList",
              },
            ]
          : []),
      ],
    },
    {
      label: t("sidebar.management"),
      items: [
        {
          title: t("sidebar.salesInventory"),
          icon: Wrench,
          url: "/layout/salesInfo",
        },
        ...(RENTAL_ENABLED
          ? [
              {
                title: t("sidebar.rentalInventory"),
                icon: Wrench,
                url: "/layout/rentalInfo",
              },
            ]
          : []),
        {
          title: t("sidebar.customers"),
          icon: Users,
          url: "/layout/customers",
        },
      ],
    },
  ];

  const activeSidebar = role === "admin" ? adminSidebar : staffSidebar;

  return (
    <Sidebar>
      <SidebarContent>
        {activeSidebar.map((group) => {
          const isOpen = openGroups[group.label] ?? false;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel
                className="flex items-center justify-between cursor-pointer select-none text-sm font-semibold"
                onClick={() => toggleGroup(group.label)}
              >
                <span>{group.label}</span>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="w-4 h-4 transition-transform duration-200" />
                )}
              </SidebarGroupLabel>

              <SidebarGroupContent
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.url}
                          className="flex items-center gap-2 pl-3 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors"
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
};

export default LayoutSidebar;
