import { AuthLayout } from "@/features/auth/components/AuthLayout"
import { RegisterForm } from "@/features/auth/components/RegisterForm"

export default function RegisterPage() {
  return (
    <AuthLayout title="Create account" description="Enter your details to get started">
      <RegisterForm />
    </AuthLayout>
  )
}
