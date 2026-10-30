import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/auth/AuthLayout'
import { RegisterForm } from '../components/auth/RegisterForm'
import { FullPageLoader } from '../components/ui/FullPageLoader'

export function RegisterPage() {
  const { status } = useAuth()

  if (!import.meta.env.DEV) {
    return <Navigate to="/login" replace />
  }

  if (status === 'loading') return <FullPageLoader />
  if (status === 'authenticated') {
    return <Navigate to="/inventario" replace />
  }

  return (
    <AuthLayout
      title="Crea tu cuenta local"
      description="Este acceso solo existe en desarrollo para que puedas probar la plataforma sin salir del navegador."
      footer={
        <p className="text-center text-sm text-slate-500">
          El registro público se puede desactivar en producción.
        </p>
      }
    >
      <RegisterForm />
    </AuthLayout>
  )
}
