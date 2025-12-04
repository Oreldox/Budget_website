'use client'

import { forwardRef } from 'react'
import ReactDatePicker, { registerLocale } from 'react-datepicker'
import { fr } from 'date-fns/locale/fr'
import 'react-datepicker/dist/react-datepicker.css'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

registerLocale('fr', fr)

interface DatePickerProps {
  value?: string
  onChange: (date: string) => void
  className?: string
  placeholder?: string
  required?: boolean
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ value, onChange, className, placeholder, required }, ref) => {
    const selectedDate = value ? new Date(value) : null

    const handleChange = (date: Date | null) => {
      if (date) {
        onChange(date.toISOString().split('T')[0])
      } else {
        onChange('')
      }
    }

    return (
      <div className="relative">
        <ReactDatePicker
          selected={selectedDate}
          onChange={handleChange}
          dateFormat="dd/MM/yyyy"
          locale="fr"
          placeholderText={placeholder || 'Sélectionner une date'}
          required={required}
          className={cn(
            'h-9 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500',
            className
          )}
          calendarClassName="bg-slate-800 border-slate-700"
          showPopperArrow={false}
          popperClassName="date-picker-popper"
        />
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'
