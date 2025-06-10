import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/ui/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Report from "./pages/Report";
import SalesInventory from "./pages/SalesInventory";
import Customers from "./pages/Customers";
import Branch from "./pages/Branch";
import RentalOrdersPage from "./pages/RentalOrderPage";

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
          <Route path="salesInfo" element={<SalesInventory/>}/>
          <Route path="customers" element={<Customers/>}/>
          <Route path="branches" element={<Branch />} />
          <Route path="rentalOrder" element={<RentalOrdersPage/>}/>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
