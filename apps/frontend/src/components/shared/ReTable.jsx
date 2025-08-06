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

/**
 * ReTable: A reusable table with built-in view, edit, and delete actions.
 * Supports custom edit handling via onEditClick or a fully custom form via renderEditForm.
 *
 * Props:
 * - data: Array of items to display.
 * - columns: Array<{ key: string; label: string }> defining visible columns.
 * - onDelete: (id: string) => void
 * - onEdit: (id: string, updatedData: object) => void (default internal submit handler)
 * - onEditClick?: (item: object) => void  (external edit handler)
 * - renderEditForm?: (formState: object, handleChange: (e) => void) => ReactNode
 * - showViewButton?: boolean
 * - showEditButton?: boolean
 */

const ReTable = ({
  data,
  columns,
  onDelete,
  onEdit,
  onEditClick,
  renderEditForm,
  showViewButton = true,
  showEditButton = true,
}) => {
  const [editItem, setEditItem] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formState, setFormState] = useState({});

  const openEditDialog = (item) => {
    setEditItem(item);
    // Flatten nested objects (e.g., address, size, color) into top-level formState
    const flattened = { ...item };
    Object.entries(item).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value).forEach(([subKey, subVal]) => {
          flattened[subKey] = subVal;
        });
      }
    });
    setFormState(flattened);
    setIsEditOpen(true);
  };

  const handleEditButtonClick = (item) => {
    if (onEditClick) return onEditClick(item);
    openEditDialog(item);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = () => {
    // Reconstruct nested objects if needed (e.g., address)
    const updatedData = { ...formState };
    // Example for address: combine street, area, city, pincode back
    if (
      'street' in formState &&
      'area' in formState &&
      'city' in formState &&
      'pincode' in formState
    ) {
      updatedData.address = {
        street: formState.street,
        area: formState.area,
        city: formState.city,
        pincode: formState.pincode,
      };
      delete updatedData.street;
      delete updatedData.area;
      delete updatedData.city;
      delete updatedData.pincode;
    }
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
                  let value = col.key.includes('.')
                    ? col.key.split('.').reduce((o, k) => o?.[k], item)
                    : item[col.key];
                  if (typeof value === 'object' && value !== null) {
                    if (col.key === 'address') {
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
                  {showEditButton && (
                    <Button size="sm" onClick={() => handleEditButtonClick(item)}>
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
              <TableCell
                colSpan={columns.length + 1}
                className="text-center text-muted-foreground"
              >
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
            {renderEditForm ? (
              renderEditForm(formState, handleChange)
            ) : (
              columns.map((col) => (
                <Input
                  key={col.key}
                  name={col.key}
                  placeholder={col.label}
                  value={formState[col.key] || ''}
                  onChange={handleChange}
                />
              ))
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
