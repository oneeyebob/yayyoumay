'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '0.5px solid #ddd',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const passwordReset = searchParams.get('reset') === '1'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [usernameFocused, setUsernameFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Accounts have no real email — derive the fake Supabase auth email from
    // the username. This mirrors what registerUser does on signup, so no
    // database lookup is needed here.
    const fakeEmail = `${username.trim().toLowerCase()}@yayyoumay.local`

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    })

    if (signInError) {
      setError('Forkert brugernavn eller adgangskode.')
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '16px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          maxWidth: 900,
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          border: '0.5px solid #e5e5e5',
        }}
        className="login-card"
      >

        {/* ── Left column — brand ──────────────────────────────────────── */}
        <div
          className="login-left"
          style={{
            backgroundColor: '#1a1a1a',
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <img
              src="/yay-logo-compact.svg"
              alt="YAY!"
              style={{ height: 36, filter: 'brightness(0) invert(1)', marginBottom: 32 }}
            />
            <p
              style={{
                color: 'white',
                fontSize: 22,
                fontWeight: 500,
                lineHeight: 1.3,
                marginBottom: 12,
              }}
            >
              VideoTube til børn - af forældre til forældre.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6 }}>
              Vi viser rigtige YouTube-videoer og kanaler - men kun dem andre forældre har godkendt. Ingen overraskelser, ingen algoritme.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 48 }}>
            {['Ingen reklamer', 'Ingen algoritme', 'Kun godkendt indhold'].map((label) => (
              <span
                key={label}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  padding: '5px 12px',
                  borderRadius: 20,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right column — form ──────────────────────────────────────── */}
        <div style={{ backgroundColor: 'white', padding: 48 }}>

          {/* Mobile-only logo */}
          <img
            src="/yay-logo-compact.svg"
            alt="YAY!"
            className="login-mobile-logo"
            style={{ height: 28, filter: 'brightness(0)', marginBottom: 24, display: 'none' }}
          />

          <p style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>
            Log ind
          </p>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 28 }}>
            Velkommen tilbage.
          </p>

          {passwordReset && (
            <p
              style={{
                fontSize: 13,
                color: '#166534',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 20,
              }}
            >
              ✓ Adgangskode opdateret. Log ind med din nye adgangskode.
            </p>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                htmlFor="username"
                style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 6 }}
              >
                Brugernavn
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                placeholder="Dit brugernavn"
                style={{
                  ...inputStyle,
                  borderColor: usernameFocused ? '#1a1a1a' : '#ddd',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 6 }}
              >
                Adgangskode
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="Din adgangskode"
                style={{
                  ...inputStyle,
                  borderColor: passwordFocused ? '#1a1a1a' : '#ddd',
                }}
              />
            </div>

            {error && (
              <p
                style={{
                  fontSize: 13,
                  color: '#dc2626',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '8px 12px',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#1a1a1a',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: 11,
                width: '100%',
                fontSize: 14,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                marginTop: 4,
              }}
            >
              {loading ? 'Logger ind…' : 'Log ind'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#999', margin: 0 }}>
              Ny her?{' '}
              <a href="/register" style={{ color: '#1a1a1a', fontWeight: 500, textDecoration: 'none' }}>
                Opret konto
              </a>
            </p>

            <p style={{ textAlign: 'center', margin: 0 }}>
              <a href="/recover" style={{ fontSize: 13, color: '#ccc', textDecoration: 'none' }}>
                Glemt din adgangskode?
              </a>
            </p>
          </form>
        </div>

      </div>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .login-card {
            grid-template-columns: 1fr !important;
          }
          .login-left {
            display: none !important;
          }
          .login-mobile-logo {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
