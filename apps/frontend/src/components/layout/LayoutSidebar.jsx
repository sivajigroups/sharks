import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Home,
  ShoppingCart,
  Users,
  UserRoundPen,
  Languages,
  Wrench,
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
  const { t, i18n } = useTranslation();
  const role = useSelector((state) => state.auth.role);

  const toggleLanguage = () => {
    const nextLang = i18n.language === "en" ? "ta" : "en";
    i18n.changeLanguage(nextLang);
  };

  const adminSidebar = [
    {
      label: t("sidebar.general"),
      items: [
        { title: t("sidebar.dashboard"), icon: Home, url: "/layout/dashboard" },
      ],
    },
    {
      label: t("sidebar.inventory"),
      items: [
        {
          title: t("sidebar.salesInventory"),
          icon: Wrench,
          url: "/layout/salesInfo",
        },
      ],
    },
    {
      label: t("sidebar.management"),
      items: [
        { title: t("sidebar.customers"), icon: Users, url: "/layout/customers" },
      ],
    },
    {
      label:t("sidebar.Billing"),
      items:[{
        title:t("sidebar.sales"),
        icon: ShoppingCart,
        url:"/layout/billing",
      }]
    },
    {
      label: t("sidebar.administration"),
      items: [
        { title: t("sidebar.profile"), icon: UserRoundPen, url: "/layout/users" },
      ],
    },
  ];

  return (
    <Sidebar>
      <SidebarContent>
       

        {/* Sidebar Items */}
        {adminSidebar.map((group) => (
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
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
         {/* Language Toggle Button */}
        <div className="p-4">
          <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1"
    >
      <Languages className="w-4 h-4" />
      {i18n.language === "en" ? "தமிழில்" : "English"}
    </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default LayoutSidebar;
