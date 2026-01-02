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
        
        {/* TODO: Add protected routes */}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
