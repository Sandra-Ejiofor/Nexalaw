'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import styles from '../auth.module.css'

interface FormErrors {
  displayName?: string | null
  email?: string | null
  password?: string | null
}

type TouchedFields = Record<'displayName' | 'email' | 'password', boolean>

function getDisplayNameError(value: string, trigger: 'change' | 'blur' | 'submit'): string | null {
  if (!value) {
    if (trigger === 'submit') return 'Field cannot be empty'
    if (trigger === 'blur') return 'This field cannot be empty'
    return null
  }
  return value.length < 2 ? 'Full name must be at least 2 characters' : null
}

function getEmailError(value: string, trigger: 'change' | 'blur' | 'submit'): string | null {
  if (!value) {
    if (trigger === 'submit') return 'Field cannot be empty'
    if (trigger === 'blur') return 'Enter a valid email address'
    return null
  }
  if (!value.includes('@')) return 'Enter a valid email address'
  const parts = value.split('@')
  if (parts.length !== 2 || !parts[1] || !parts[1].includes('.')) return 'Enter a valid email address'
  return null
}

function getPasswordError(value: string, mode: 'login' | 'register', trigger: 'change' | 'blur' | 'submit'): string | null {
  if (!value) {
    if (trigger === 'submit') return 'Field cannot be empty'
    if (trigger === 'blur') return 'This field cannot be empty'
    return null
  }
  if (mode === 'register' && value.length < 8) return 'Password must be at least 8 characters'
  return null
}

export default function AuthPage(): React.JSX.Element {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<TouchedFields>({ displayName: false, email: false, password: false })
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value)
    if (touched.displayName || value) {
      setErrors(prev => ({ ...prev, displayName: getDisplayNameError(value, 'change') }))
    }
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setErrors(prev => ({ ...prev, email: getEmailError(value, 'change') }))
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (touched.password || value) {
      setErrors(prev => ({ ...prev, password: getPasswordError(value, mode, 'change') }))
    }
  }

  const handleBlur = (field: keyof FormErrors) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const value = field === 'displayName' ? displayName : field === 'email' ? email : password
    let error: string | null = null
    if (field === 'displayName') error = getDisplayNameError(value, 'blur')
    else if (field === 'email') error = getEmailError(value, 'blur')
    else if (field === 'password') error = getPasswordError(value, mode, 'blur')
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    if (mode === 'register') {
      newErrors.displayName = getDisplayNameError(displayName, 'submit')
    }
    newErrors.email = getEmailError(email, 'submit')
    newErrors.password = getPasswordError(password, mode, 'submit')
    setErrors(newErrors)
    setTouched({ displayName: true, email: true, password: true })
    return !newErrors.displayName && !newErrors.email && !newErrors.password
  }, [mode, displayName, email, password])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    setServerError(null)
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setServerError('Invalid email or password.')
        setIsLoading(false)
      } else {
        router.push('/chat')
        router.refresh()
      }
    } catch {
      setServerError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    setServerError(null)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        setServerError(data.message || 'Registration failed.')
        setIsLoading(false)
        return
      }
      router.push('/auth')
    } catch {
      setServerError('An unexpected error occurred.')
      setIsLoading(false)
    }
  }

  const switchMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login')
    setDisplayName('')
    setEmail('')
    setPassword('')
    setErrors({})
    setTouched({ displayName: false, email: false, password: false })
    setServerError(null)
  }

  return (
    <div className={styles.pageRoot}>
      {/* ── LEFT PANEL — gavel image ── */}
      <div className={styles.imagePanel}>
        <div className={styles.imageCard}>
          <Image
            src="/login-image.png"
            alt="Judge's gavel on a legal document"
            fill
            className={styles.gavelImage}
            sizes="(max-width: 768px) 0px, 45vw"
            priority
          />
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className={styles.formPanel}>
        <div className={styles.authCard}>
          {/* Logo */}
          <div className={styles.logoWrap}>
            <Image
              src="/dark-logo.png"
              alt="Nexalaw"
              width={160}
              height={42}
              className={styles.authLogo}
              priority
            />
          </div>

          {/* Heading */}
          <div className={styles.authHeader}>
            <h1 className={styles.authTitle}>
              {mode === 'login' ? 'Welcome Back' : 'Create an account'}
            </h1>
            <p className={styles.authSubtitle}>
              {mode === 'login'
                ? 'Log in to get started with Nexalaw'
                : 'Get started with Nexalaw today'}
            </p>
          </div>

          {/* Server error */}
          {serverError && <div className={styles.errorAlert}>{serverError}</div>}

          {/* Form */}
          <form
            onSubmit={mode === 'login' ? handleLogin : handleRegister}
            className={styles.form}
            noValidate
          >
            {mode === 'register' && (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Enter Full Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => handleDisplayNameChange(e.target.value)}
                  onBlur={() => handleBlur('displayName')}
                  disabled={isLoading}
                  className={`${styles.fieldInput} ${errors.displayName ? styles.fieldError : ''}`}
                  autoComplete="name"
                />
                {errors.displayName && (
                  <span className={styles.fieldErrorMsg}>{errors.displayName}</span>
                )}
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Enter Email</label>
              <input
                type="email"
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                onBlur={() => handleBlur('email')}
                disabled={isLoading}
                className={`${styles.fieldInput} ${errors.email ? styles.fieldError : ''}`}
                autoComplete="email"
              />
              {errors.email && (
                <span className={styles.fieldErrorMsg}>{errors.email}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                {mode === 'register' ? 'Create Password' : 'Enter Password'}
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => handlePasswordChange(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  disabled={isLoading}
                  className={`${styles.fieldInput} ${styles.passwordInput} ${errors.password ? styles.fieldError : ''}`}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(prev => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span className={styles.fieldErrorMsg}>{errors.password}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={styles.submitBtn}
            >
              {isLoading
                ? (mode === 'login' ? 'Logging in...' : 'Creating account...')
                : (mode === 'login' ? 'Login' : 'Create account')}
            </button>
          </form>

          {/* Switch mode */}
          <div className={styles.switchRow}>
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button type="button" className={styles.switchLink} onClick={switchMode}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className={styles.switchLink} onClick={switchMode}>
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
