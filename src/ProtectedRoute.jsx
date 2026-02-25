import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children }) {
    const { session } = useAuth()
    const location = useLocation()

    if (!session) {
        // Redirect to login if not authenticated, keeping the current path + search
        return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
    }

    return children
}
