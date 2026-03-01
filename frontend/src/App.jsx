import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import Login from './components/Login'
import Layout from './components/Layout'
import Upload from './components/Upload'
import Dashboard from './components/Dashboard'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [searchParams, setSearchParams] = useSearchParams()

  // OAuth redirect lands here with ?token=...
  useEffect(() => {
    const t = searchParams.get('token')
    if (t) {
      localStorage.setItem('token', t)
      setToken(t)
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  if (!token) return <Login />

  return (
    <Layout onLogout={logout}>
      <Routes>
        <Route path="/" element={<Upload />} />
        <Route path="/capture/:id" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}
