import React from "react";

export default function LecturerDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div>
      <h1>Lecturer Dashboard</h1>
      <p>Welcome, {user.name}</p>
      <p>Your courses and QR attendance sessions will appear here.</p>
    </div>
  );
}