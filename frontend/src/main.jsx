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

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

// Page components
import LoginPage from './login.jsx'
import SignupPage from './signup.jsx'
import Dashboard from './dashboard.tsx'
import CustomersPage from './customers.tsx'

// Mount the React application
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* Dashboard routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/scan" element={<Dashboard />} />
        <Route path="/dashboard/customers" element={<CustomersPage />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
