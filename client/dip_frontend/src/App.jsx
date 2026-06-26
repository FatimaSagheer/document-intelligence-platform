import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/chat";
import Documents from "./pages/Documents";
import ChatHistory from "./pages/Chathistory";
import Settings from "./pages/Settings";

// Simple inline ProtectedRoute — put this in the same file for now
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/chat/:documentId" element={
        <ProtectedRoute><Chat /></ProtectedRoute>
      } />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
<Route path="/history" element={<ProtectedRoute><ChatHistory /></ProtectedRoute>} />
<Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    </Routes>
    
  );
}