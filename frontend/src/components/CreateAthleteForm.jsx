import { useState } from 'react'
import { athleteAPI } from '../services/api'

export default function CreateAthleteForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError('Athlete name is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const newAthlete = await athleteAPI.create({
        name: formData.name.trim(),
        email: formData.email.trim(),
      })

      if (onSuccess) {
        await onSuccess(newAthlete)
      }

      onClose()
    } catch (err) {
      console.error('Failed to create athlete:', err)
      setError('Failed to create athlete. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="border border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g., John Smith"
          className="w-full border border-gray-200 px-3 py-2 text-sm"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Email <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="e.g., john@example.com"
          className="w-full border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-gray-200 pt-4 text-xs text-gray-600">
        <p>The athlete will be automatically assigned the next available rank.</p>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[#377850] text-white px-4 py-2 text-sm font-medium disabled:bg-gray-400 hover:bg-[#2d5f40]"
        >
          {isSubmitting ? 'Adding...' : 'Add Athlete'}
        </button>
      </div>
    </form>
  )
}
