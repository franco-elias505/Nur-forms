import { useState } from 'react'
import useAuthStore from '../store/authStore'
import logo from '../assets/nur_logo.png'
import './LoginForm.css'

export default function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading, error, clearError } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    try {
      const user = await login(email, password)
      if (onSuccess) onSuccess(user)
    } catch {
      // error is handled in store
    }
  }

  return (
    <form className="login-card" onSubmit={handleSubmit}>
      <div className="login-brand">
        <img src={logo} alt="FormsNur logo" className="login-logo" />
        <h1>FormsNur</h1>
      </div>

      <div className="field">
        <label htmlFor="email">Correo</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@nur.edu.bo"
          autoComplete="email"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      {error && <p className="login-error">{error}</p>}

      <button id="loginBtn" type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
        {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : null}
        {loading ? 'Ingresando...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}