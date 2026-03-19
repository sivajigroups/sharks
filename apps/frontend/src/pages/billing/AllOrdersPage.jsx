import React from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderList from "./OrderList";
import RentalOrderList from "./RentalOrderList";
import CombinedOrderList from "./CombinedOrderList";

export default function AllOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "sale";

  return (
    <div className="w-full h-full overflow-auto bg-gray-50 flex flex-col pt-6 pb-2 all-orders-wrapper">
      <style>{`
        /* Remove redundant paddings and headers from child pages so they fit perfectly in the tabs */
        .all-orders-wrapper .bg-gray-50 {
           background-color: transparent !important;
        }
        .all-orders-wrapper h1.text-3xl {
           display: none !important;
        }
      `}</style>
      {/* <div className="px-8 mt-2 mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
          Order Management
        </h1>
        <p className="text-[14px] text-gray-500 mb-6 max-w-2xl">
          Manage and view all your sales, rental, and combined invoices seamlessly from a centralized dashboard.
        </p>
      </div> */}

      <div className="px-8 flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val })} className="w-full h-full flex flex-col">
          <div className="mb-6 self-start bg-gray-200/50 p-1 rounded-full inline-flex shadow-sm">
            <TabsList className="bg-transparent h-auto p-0 border-none">
              <TabsTrigger 
                value="sale" 
                className="px-6 py-2 rounded-full data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-300 font-medium text-gray-600 text-sm"
              >
                Sales Bills
              </TabsTrigger>
              <TabsTrigger 
                value="rental" 
                className="px-6 py-2 rounded-full data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-300 font-medium text-gray-600 text-sm ml-1"
              >
                Rental Bills
              </TabsTrigger>
              <TabsTrigger 
                value="combined" 
                className="px-6 py-2 rounded-full data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-300 font-medium text-gray-600 text-sm ml-1"
              >
                Combined Bills
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="sale"
            className="m-0 border-none outline-none flex-1"
          >
            <div className="-mx-6 px-6 pb-6">
              <OrderList />
            </div>
          </TabsContent>
          <TabsContent
            value="rental"
            className="m-0 border-none outline-none flex-1"
          >
            <div className="-mx-6 px-6 pb-6">
              <RentalOrderList />
            </div>
          </TabsContent>
          <TabsContent
            value="combined"
            className="m-0 border-none outline-none flex-1"
          >
            <div className="-mx-6 px-6 pb-6">
              <CombinedOrderList />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
