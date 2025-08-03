import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ReTable = ({
  data,
  columns,
  onDelete,
  onEdit,
  showViewButton = true,
  showEdirButton = true,
}) => {
  const [editItem, setEditItem] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formState, setFormState] = useState({});

  const openEditDialog = (item) => {
    setEditItem(item);
    const flattened = {
      ...item,
      street: item.address?.street || "",
      area: item.address?.area || "",
      city: item.address?.city || "",
      pincode: item.address?.pincode || "",
    };
    setFormState(flattened);
    setIsEditOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = () => {
    const { street, area, city, pincode, ...rest } = formState;
    const updatedData = {
      ...rest,
      address: { street, area, city, pincode },
    };
    onEdit(editItem._id, updatedData);
    setIsEditOpen(false);
  };

  return (
    <div className="w-full overflow-auto">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow className="bg-black">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className="text-white uppercase font-semibold text-sm tracking-wider text-left"
              >
                {col.label}
              </TableHead>
            ))}
            <TableHead className="text-white uppercase font-semibold text-sm tracking-wider text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item, idx) => (
              <TableRow key={idx} className="last:border-none">
                {columns.map((col) => {
                  let value = col.key.includes(".")
                    ? col.key.split(".").reduce((o, k) => o?.[k], item)
                    : item[col.key];
                  if (typeof value === "object" && value !== null) {
                    if (col.key === "address") {
                      const { street, area, city, pincode } = value;
                      value = `${street}, ${area}, ${city} - ${pincode}`;
                    } else {
                      value = JSON.stringify(value);
                    }
                  }
                  return (
                    <TableCell key={col.key} className="text-left">
                      {value}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right space-x-2">
                  {showViewButton && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (window.location.href = `/layout/staff/${item._id}`)}
                    >
                      View
                    </Button>
                  )}
                  {showEdirButton && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                    >
                      Edit
                    </Button>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                      </DialogHeader>
                      <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                          className="w-[30%]"
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(item._id)}
                        >
                          Confirm
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                No records found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {columns.map((col) =>
              col.key === "address" ? (
                <div key="address-group" className="grid grid-cols-2 gap-2">
                  <Input name="street" placeholder="Street" value={formState.street || ""} onChange={handleChange} />
                  <Input name="area" placeholder="Area" value={formState.area || ""} onChange={handleChange} />
                  <Input name="city" placeholder="City" value={formState.city || ""} onChange={handleChange} />
                  <Input name="pincode" placeholder="Pincode" value={formState.pincode || ""} onChange={handleChange} />
                </div>
              ) : (
                <Input key={col.key} name={col.key} placeholder={col.label} value={formState[col.key] || ""} onChange={handleChange} />
              )
            )}
            <DialogClose asChild>
              <Button className="mt-2 w-full" onClick={handleEditSubmit}>
                Save Changes
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReTable;
