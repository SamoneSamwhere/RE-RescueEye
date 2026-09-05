import { useState } from 'react'
import type { MockUser } from '../../mockUsers'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { useUserStore } from '../../../state/UserStore'
import { useProfileDatabase } from '../../../hooks/useProfileDatabase'

interface ChangePasswordFormProps {
  user: MockUser
  isRealAccount?: boolean
  onSuccess?: () => void
}

export function ChangePasswordForm({ user, isRealAccount, onSuccess }: ChangePasswordFormProps) {
  const { updateUser } = useUserStore()
  const { changePassword } = useProfileDatabase()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      if (!formData.currentPassword) {
        throw new Error('Current password is required')
      }
      if (!formData.newPassword) {
        throw new Error('New password is required')
      }
      if (formData.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('Passwords do not match')
      }
      if (formData.newPassword === formData.currentPassword) {
        throw new Error('New password must be different from current password')
      }

      if (isRealAccount) {
        const result = await changePassword(Number(user.id), formData.currentPassword, formData.newPassword)
        if (!result.ok) throw new Error(result.error)
      } else {
        if (formData.currentPassword !== user.password) {
          throw new Error('Current password is incorrect')
        }
        updateUser(user.id, {
          password: formData.newPassword,
        })
      }

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4 px-6 py-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
        <p className="text-sm text-foreground-secondary">Update your account password</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Current Password" htmlFor="currentPassword">
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            value={formData.currentPassword}
            onChange={handleChange}
            disabled={isSaving}
            required
          />
        </Field>

        <Field label="New Password" htmlFor="newPassword" hint="At least 8 characters">
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={handleChange}
            disabled={isSaving}
            required
          />
        </Field>

        <Field label="Confirm New Password" htmlFor="confirmPassword">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isSaving}
            required
          />
        </Field>

        {error && (
          <div className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-fg" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-success-subtle px-3 py-2 text-sm text-success-fg" role="status">
            Password changed successfully
          </div>
        )}

        <Button type="submit" disabled={isSaving} className="w-full">
          {isSaving ? 'Updating...' : 'Change Password'}
        </Button>
      </form>
    </Card>
  )
}
