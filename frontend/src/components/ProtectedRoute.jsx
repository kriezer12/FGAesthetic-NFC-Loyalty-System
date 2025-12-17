import { Navigate } from 'react-router-dom'
import { authService } from '../services/api'

function ProtectedRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute