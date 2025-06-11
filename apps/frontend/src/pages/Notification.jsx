import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Trash2 } from "lucide-react";

const dummyNotifications = [
  {
    id: 1,
    title: "New customer added",
    message: "John Doe was added to your customer list.",
    timestamp: "5 mins ago",
  },
  {
    id: 2,
    title: "Low stock alert",
    message: "Only 2 units of 'Power Drill' remaining.",
    timestamp: "2 hours ago",
  },
  {
    id: 3,
    title: "Rental returned",
    message: "Ramesh Kumar returned equipment today.",
    timestamp: "Yesterday",
  },
];

const Notifications = () => {
  const [notifications, setNotifications] = useState(dummyNotifications);

//   const deleteNotification = (id) => {
//     setNotifications((prev) => prev.filter((n) => n.id !== id));
//   };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        Notifications
      </h1>

      {notifications.length === 0 ? (
        <p className="text-muted-foreground">No notifications available</p>
      ) : (
        notifications.map((n) => (
          <Card key={n.id} className="shadow-sm">
            <CardContent className="p-4 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">{n.title}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-gray-500 mt-1">{n.timestamp}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default Notifications;
