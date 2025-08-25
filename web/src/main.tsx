import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SmartLockerDashboard from "./SmartLockerDashboard"; // ← ชี้ไฟล์จริงให้ถูก

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SmartLockerDashboard />} /> {/* ← ใช้ชื่อคอมโพเนนต์ที่ import มาจริง */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
