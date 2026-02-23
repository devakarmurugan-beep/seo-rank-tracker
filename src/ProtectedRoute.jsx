import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children }) {
    const { session } = useAuth()

    if (!session) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" replace />
    }

    return children
}
