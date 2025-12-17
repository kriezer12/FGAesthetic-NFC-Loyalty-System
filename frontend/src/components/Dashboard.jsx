import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'

function Dashboard() {
  const user = authService.getUser()
  const navigate = useNavigate()

  const handleLogout = () => {
    authService.logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-md">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.name}!</h1>
            <p className="text-gray-600 mt-2">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Loyalty Card</h2>
            <p className="text-gray-600">Your loyalty card information will appear here</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Points Balance</h2>
            <p className="text-3xl font-bold text-blue-600">0</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard