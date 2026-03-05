import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MachineProvider, useMachine } from './context/MachineContext'
import SetupScreen from './pages/SetupScreen'
import LotteryDisplay from './pages/LotteryDisplay'
import AdminConsole from './pages/AdminConsole'

function ProtectedRoute({ children }) {
  const { isConfigured } = useMachine()
  if (!isConfigured) return <Navigate to="/" replace />
  return children
}

function AutoRedirect({ children }) {
  const { isConfigured } = useMachine()
  if (isConfigured) return <Navigate to="/lottery" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <MachineProvider>
        <Routes>
          <Route path="/" element={
            <AutoRedirect>
              <SetupScreen />
            </AutoRedirect>
          } />
          <Route path="/lottery" element={
            <ProtectedRoute>
              <LotteryDisplay />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminConsole />
            </ProtectedRoute>
          } />
        </Routes>
      </MachineProvider>
    </BrowserRouter>
  )
}
