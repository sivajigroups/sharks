import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  MoreVertical,
  Printer,
  FileText,
  Download
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow}
  from '@/components/ui/table'
  import {Button} from '@/components/ui/button'
  import {Input} from '@/components/ui/input'
  import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'; 
import { Badge } from '@/components/ui/badge';

const RentalOrdersPage = () => {
  // Sample data - replace with real API data
  const [orders, setOrders] = useState([
    {
      id: 'RO-1001',
      customer: 'John Doe',
      tool: 'Hammer Drill',
      branch: 'Main Branch',
      startDate: '2023-10-15',
      endDate: '2023-10-20',
      status: 'overdue',
      total: 2500
    },
    // Add more sample orders...
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  // Filter orders based on search term
  const filteredOrders = orders.filter(order =>
    Object.values(order).some(
      value => value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { color: 'default', text: 'Active' },
      completed: { color: 'secondary', text: 'Completed' },
      overdue: { color: 'outline', text: 'Overdue' },
      pending: { color: 'destructive', text: 'Pending' }
    };
    const { color, text } = statusMap[status] || { color: 'gray', text: 'Unknown' };
    return <Badge variant={color}>{text}</Badge>;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rental Orders</h1>
        <Link to="/rental-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Rental Order
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search orders..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Tool</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Rental Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total (₹)</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{order.tool}</TableCell>
                  <TableCell>{order.branch}</TableCell>
                  <TableCell>
                    {order.startDate} to {order.endDate}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>₹{order.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Printer className="mr-2 h-4 w-4" />
                          Print Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No rental orders found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-500">
          Showing 1 to {filteredOrders.length} of {orders.length} entries
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            Previous
          </Button>
          <Button variant="outline">Next</Button>
        </div>
      </div>
    </div>
  );
};

export default RentalOrdersPage;