import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/auth/AuthLayout'
import { LoginForm } from '../components/auth/LoginForm'
import { FullPageLoader } from '../components/ui/FullPageLoader'

export function LoginPage() {
  const { status } = useAuth()

  if (status === 'loading') return <FullPageLoader />
  if (status === 'authenticated') {
    return <Navigate to="/inventario" replace />
  }

  return (
    <AuthLayout
      title="Bienvenido de nuevo"
      description="Inicia sesión para consultar existencias, registrar movimientos y coordinar traslados."
      footer={
        <p className="text-center text-sm text-slate-500">
          Panel de inventario · Gestión de existencias
        </p>
      }
    >
      <LoginForm />
    </AuthLayout>
  )
}
