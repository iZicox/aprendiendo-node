import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/auth/AuthLayout'
import { RegisterForm } from '../components/auth/RegisterForm'
import { FullPageLoader } from '../components/ui/FullPageLoader'

export function RegisterPage() {
  const { status } = useAuth()

  if (status === 'loading') return <FullPageLoader />
  if (status === 'authenticated') {
    return <Navigate to="/inventario" replace />
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      description="Las cuentas nuevas tienen rol de usuario. Un administrador puede cambiar el rol."
    >
      <RegisterForm />
    </AuthLayout>
  )
}
