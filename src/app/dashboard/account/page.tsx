import ChangeNameForm from "@/features/account/components/changeNameForm"
import ChangePasswordForm from "@/features/account/components/changePasswordForm"

export default function AccountPage() {
  return (
    <div className="flex max-w-xl flex-col gap-6 p-6">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-4">
        <ChangeNameForm />
        <ChangePasswordForm />
      </div>
    </div>
  )
}
