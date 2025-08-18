import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Report from "./pages/Report";
import SalesInventory from "./pages/SalesInventory";
import Customers from "./pages/Customers";
import Branch from "./pages/Branch";
import RentalOrdersPage from "./pages/orders/RentalOrderPage";
import Notifications from "./pages/Notification";
import StaffPage from "./pages/StaffPage";
import Attendance from "./pages/Attendance";
import InventoryManager from "./pages/InventoryManager";
import OrderManager from "./pages/orders/orderManager";
import StaffDetail from "./pages/StaffDetail";
import NewOrder from "./pages/orders/NewOrder";
import "./i18n";
import SalesBilling from "./pages/billing/SalesBilling";
import CustomerDetails from "./pages/CustomerDetails";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Protected Routes with Layout */}
        <Route path="/layout" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="report" element={<Report />} />
          {/* <Route path="salesInfo" element={<SalesInventory />} /> */}
          <Route path="customers" element={<Customers />} />
          <Route path="branches" element={<Branch />} />
          <Route path="billing" element={<SalesBilling />} />
          {/* <Route path="rentalOrder" element={<RentalOrdersPage />} /> */}
          {/* <Route path="rentalOrder" element={<OrderManager type="rental" title="Rental Orders" newOrderPath="/layout/rentalOrder/new" />} /> */}
          <Route path="rentalOrder/new" element={<NewOrder />} />
          <Route
            path="salesOrder"
            element={
              <OrderManager
                type="sales"
                title="Sales Orders"
                newOrderPath="/layout/rentalOrder/new"
              />
            }
          />
          <Route
            path="serviceOrder"
            element={
              <OrderManager
                type="service"
                title="Rental Orders"
                newOrderPath="/layout/rentalOrder/new"
              />
            }
          />
          <Route path="notification" element={<Notifications />} />
          <Route path="users" element={<StaffPage />} />
          <Route path="attendance" element={<Attendance />} />
          <Route
            path="/layout/salesInfo"
            element={<InventoryManager type="sales" title="Sales Inventory" />}
          />
          <Route
            path="/layout/rentalInfo"
            element={
              <InventoryManager type="rental" title="Rental Inventory" />
            }
          />
          <Route
            path="/layout/serviceInfo"
            element={
              <InventoryManager type="service" title="Service Inventory" />
            }
          />
          <Route path="/layout/staff/:id" element={<StaffDetail />} />
          <Route path="customers/:id" element={<CustomerDetails />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
