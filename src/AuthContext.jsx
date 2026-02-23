import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check active session on mount
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setSession(session)
                setLoading(false)
            })
            .catch((err) => {
                console.error('Supabase auth error:', err)
                setSession(null)
                setLoading(false)
            })

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    return (
        <AuthContext.Provider value={{ session, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    return useContext(AuthContext)
}
