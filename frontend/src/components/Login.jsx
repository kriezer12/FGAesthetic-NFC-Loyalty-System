import { useState } from 'react'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Login attempt:', { email, password })
    alert(`Login clicked! Email: ${email}`)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/60 bg-amber-200/10 text-amber-200">
            GL
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Glam-ID</p>
          <h1 className="mt-1 text-2xl font-semibold text-amber-100">NFC Loyalty System</h1>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-200">
            <span className="mb-2 block">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-4 py-3 text-slate-50 placeholder:text-slate-500 focus:border-amber-300/70 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
              placeholder="staff@fgaesthetic.com"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            <span className="mb-2 block">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-4 py-3 text-slate-50 placeholder:text-slate-500 focus:border-amber-300/70 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
              placeholder="••••••••"
              required
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-amber-300 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 transition hover:-translate-y-0.5 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Login
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">FG Aesthetic Centre</p>
      </div>
    </div>
  )
}

export default Login