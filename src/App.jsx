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
import Dashboard from './pages/Dashboard'
import PrintReport from './pages/PrintReport'
import MentorDashboard from './pages/MentorDashboard'
import OfficialReadiness from './pages/OfficialReadiness'
import Scenarios from './pages/Scenarios'
import QABoard from './pages/QABoard'

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
        <Route path="/:classLevel/onboarding" element={<Onboarding />} />
        <Route path="/result"            element={<Result />} />
        <Route path="/:classLevel/result" element={<Result />} />
        <Route path="/mentors"           element={<Mentors />} />
        <Route path="/roadmap"           element={<Roadmap />} />
        <Route path="/:classLevel/roadmap" element={<Roadmap />} />
        <Route path="/profile"           element={<Dashboard />} />
        <Route path="/dashboard"         element={<Dashboard />} />
        <Route path="/result/print"      element={<PrintReport />} />
        <Route path="/:classLevel/result/print" element={<PrintReport />} />
        <Route path="/mentor-dashboard"  element={<MentorDashboard />} />
        <Route path="/official-readiness" element={<OfficialReadiness />} />
        <Route path="/scenarios"         element={<Scenarios />} />
        <Route path="/qa"                element={<QABoard />} />
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
