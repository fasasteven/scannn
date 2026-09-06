import React from "react";

export default function StudentDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div>
      <h1>Student Dashboard</h1>
      <p>Welcome, {user.name}</p>
      <p>Your courses and attendance records will appear here.</p>
    </div>
  );
}