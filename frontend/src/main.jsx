/**
 * Application Entry Point
 * ========================
 * 
 * Main entry point for the React application.
 * Sets up React Router for client-side navigation.
 * 
 * Routes:
 * - /        : Redirects to /login
 * - /login   : Login page
 * - /signup  : Registration page
 * - /dashboard : Dashboard (TODO: implement)
 */

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import "./index.css"

import CheckinLogsPage from "./pages/checkin-logs.tsx"
import CustomersPage from "./pages/customers.tsx"
import Dashboard from "./pages/dashboard.tsx"
import NFCScanPage from "./pages/nfc-scan.tsx"
import LoginPage from "./pages/login.jsx"
import SignupPage from "./pages/signup.jsx"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/scan" element={<NFCScanPage />} />
        <Route path="/dashboard/customers" element={<CustomersPage />} />
        <Route path="/dashboard/checkin-logs" element={<CheckinLogsPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
