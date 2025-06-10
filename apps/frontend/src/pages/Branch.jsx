import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import { branchData } from "@/Data/data";

const Branch = () => {
  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 space-y-6 w-308">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
        Branches Management
      </h1>

      <Card>
        <CardContent className="p-4">
          <div className="flex justify-end mb-4">
            <Button><Plus className="mr-2 h-4 w-4" />Add Branch</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-black hover:bg-black">
                <TableHead className="text-white">Branch Name</TableHead>
                <TableHead className="text-white">Address</TableHead>
                <TableHead className="text-white">Contact</TableHead>
                <TableHead className="text-white">Staff</TableHead>
                <TableHead className="text-white">Tools</TableHead>
                <TableHead className="text-white text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchData.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.address}</TableCell>
                  <TableCell>{branch.contact}</TableCell>
                  <TableCell>{branch.staffCount}</TableCell>
                  <TableCell>{branch.toolCount}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm" variant="secondary">Transfer Tool</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Branch;
