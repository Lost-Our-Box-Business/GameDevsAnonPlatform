import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { ProtectedRoute } from './components/ProtectedRoute'

import { Home } from './pages/Home'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { Login } from './pages/Login'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { Profile } from './pages/Profile'
import { GDD } from './pages/GDD'
import { SocialSubmit } from './pages/SocialSubmit'

import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { ProjectAdmin } from './pages/admin/ProjectAdmin'
import { MeetingsAdmin } from './pages/admin/MeetingsAdmin'
import { TasksAdmin } from './pages/admin/TasksAdmin'
import { MembersAdmin } from './pages/admin/MembersAdmin'
import { SocialAdmin } from './pages/admin/SocialAdmin'
import { RevenueAdmin } from './pages/admin/RevenueAdmin'

export default function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
          <Route path="/login" element={<Login />} />

          {/* Member-only */}
          <Route path="/projects/:slug/join" element={
            <ProtectedRoute><Onboarding /></ProtectedRoute>
          } />
          <Route path="/projects/:slug/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/projects/:slug/board" element={
            <ProtectedRoute><Dashboard boardView /></ProtectedRoute>
          } />
          <Route path="/projects/:slug/gdd" element={
            <ProtectedRoute><GDD /></ProtectedRoute>
          } />
          <Route path="/projects/:slug/social" element={
            <ProtectedRoute><SocialSubmit /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="projects" element={<ProjectAdmin />} />
            <Route path="projects/:id" element={<ProjectAdmin />} />
            <Route path="meetings" element={<MeetingsAdmin />} />
            <Route path="tasks" element={<TasksAdmin />} />
            <Route path="members" element={<MembersAdmin />} />
            <Route path="social" element={<SocialAdmin />} />
            <Route path="revenue" element={<RevenueAdmin />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={
            <div className="max-w-6xl mx-auto px-4 py-32 text-center">
              <h1 className="text-4xl font-bold text-white mb-4">404</h1>
              <p className="text-zinc-400">Page not found.</p>
            </div>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
