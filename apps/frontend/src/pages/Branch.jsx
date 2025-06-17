import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import ReTable from "@/components/shared/ReTable";
import { branchData } from "@/Data/data";

const Branch = () => {
  const columns = [
    { key: "name", label: "Branch Name" },
    { key: "address", label: "Address" },
    { key: "contact", label: "Contact" },
    { key: "staffCount", label: "Staff" },
    { key: "toolCount", label: "Tools" },
  ];

  const handleEdit = (id, updatedItem) => {
    console.log("Edit branch", id, updatedItem);
  };

  const handleDelete = (id) => {
    console.log("Delete branch", id);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 space-y-6 w-308">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
        Branches Management
      </h1>

      <Card>
        <CardContent className="p-4">
          <div className="flex justify-end mb-4">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Branch
            </Button>
          </div>

          <ReTable
            data={branchData}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Branch;
