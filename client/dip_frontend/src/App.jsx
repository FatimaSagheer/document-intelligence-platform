import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import { supabase } from "./supabaseClient";

export default function App() {
  console.log('SUPABASE URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('SUPABASE KEY:', process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY);
//   useEffect(() => {
//   supabase.auth.onAuthStateChange((event, session) => {
//     console.log("AUTH EVENT:", event, session);
//   });
// }, []);
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}