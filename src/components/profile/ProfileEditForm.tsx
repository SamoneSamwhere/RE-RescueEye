import { useState } from 'react'
import type { MockUser } from '../../data/mockUsers'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { useUserStore } from '../../state/UserStore'

interface ProfileEditFormProps {
  user: MockUser
  onSuccess?: () => void
}

export function ProfileEditForm({ user, onSuccess }: ProfileEditFormProps) {
  const { updateUser } = useUserStore()
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
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
      if (!formData.name.trim()) {
        throw new Error('Name is required')
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required')
      }

      updateUser(user.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
      })

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4 px-6 py-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Edit Profile</h2>
        <p className="text-sm text-foreground-secondary">Update your account information</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Full Name" htmlFor="name">
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={isSaving}
            required
          />
        </Field>

        <Field label="Email Address" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            disabled={isSaving}
            required
          />
        </Field>

        <Field label="Phone Number (Optional)" htmlFor="phone" hint="Include country code if outside US">
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1-555-0000"
            disabled={isSaving}
          />
        </Field>

        {error && (
          <div className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-fg" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-success-subtle px-3 py-2 text-sm text-success-fg" role="status">
            Profile updated successfully
          </div>
        )}

        <Button
          type="submit"
          disabled={isSaving || (formData.name === user.name && formData.email === user.email && formData.phone === (user.phone || ''))}
          className="w-full"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Card>
  )
}
