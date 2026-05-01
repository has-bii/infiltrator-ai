import { AuthLayout } from "@/features/auth/components/AuthLayout"
import { LoginForm } from "@/features/auth/components/LoginForm"

export default function LoginPage() {
  return (
    <AuthLayout title="Sign in" description="Enter your credentials to continue">
      <LoginForm />
    </AuthLayout>
  )
}
