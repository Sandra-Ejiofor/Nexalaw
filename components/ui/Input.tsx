'use client'

import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, helperText, id, className, ...props }, ref) {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className={styles.inputGroup}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`${styles.input} ${error ? styles.error : ''} ${className ?? ''}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <span id={`${inputId}-error`} className={styles.errorMessage} role="alert">
            {error}
          </span>
        )}
        {helperText && !error && (
          <span className={styles.helperText}>{helperText}</span>
        )}
      </div>
    )
  }
)

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, id, className, ...props }, ref) {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className={styles.inputGroup}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          className={`${styles.input} ${styles.textarea} ${error ? styles.error : ''} ${className ?? ''}`}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
        {error && (
          <span className={styles.errorMessage} role="alert">
            {error}
          </span>
        )}
      </div>
    )
  }
)
