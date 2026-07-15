import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import Result from './pages/Result'
import Mentors from './pages/Mentors'
import Roadmap from './pages/Roadmap'
import Profile from './pages/Profile'
import MentorDashboard from './pages/MentorDashboard'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-enter flex-1">
      <Routes location={location}>
        <Route path="/"                  element={<Landing />} />
        <Route path="/onboarding"        element={<Onboarding />} />
        <Route path="/result"            element={<Result />} />
        <Route path="/mentors"           element={<Mentors />} />
        <Route path="/roadmap"           element={<Roadmap />} />
        <Route path="/profile"           element={<Profile />} />
        <Route path="/mentor-dashboard"  element={<MentorDashboard />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-navy flex flex-col">
          <ScrollToTop />
          <Navbar />
          <AnimatedRoutes />
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
