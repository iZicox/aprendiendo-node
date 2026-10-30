import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { CreateMovementPage } from './pages/CreateMovementPage'
import { CreateProductPage } from './pages/CreateProductPage'
import { CreateTransferPage } from './pages/CreateTransferPage'
import { GeneralInventoryPage } from './pages/GeneralInventoryPage'
import { LocationInventoryPage } from './pages/LocationInventoryPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {import.meta.env.DEV && (
        <Route path="/registro" element={<RegisterPage />} />
      )}

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/inventario" replace />} />
        <Route path="/inventario" element={<GeneralInventoryPage />} />
        <Route
          path="/inventario/ubicaciones"
          element={<LocationInventoryPage />}
        />
        <Route path="/productos/nuevo" element={<CreateProductPage />} />
        <Route path="/movimientos/nuevo" element={<CreateMovementPage />} />
        <Route path="/traslados/nuevo" element={<CreateTransferPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
