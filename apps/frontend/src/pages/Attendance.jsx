import { Card } from "@/components/ui/card";
import React, { useEffect, useState } from "react";

const Attendance = () => {
  const [attendanceData, setAttendanceData] = useState({ attendance: [] });

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await fetch("http://localhost:4000/api/attendance", {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch attendance data");
        }
        const data = await response.json();
        setAttendanceData(data);
        console.log(data); // ✅ Save to state
      } catch (error) {
        console.error("Error fetching attendance:", error);
      }
    };

    fetchAttendance();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
        Attendance Management
      </h1>
      <Card className="mt-6 p-6 bg-gray-100 dark:bg-gray-900">
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            This page will display attendance records and allow management of
            attendance data.
          </p>
          {attendanceData.attendance && attendanceData.attendance.length > 0 ? (
            attendanceData.attendance.map((attendance, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {attendance.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Date: {new Date(attendance.date).toLocaleDateString()}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Hours Worked: {attendance.hoursWorked ?? "N/A"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No attendance records found.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Attendance;
