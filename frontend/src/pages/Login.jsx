import { useState } from "react";

function Login({ onSubmit, busy, error, onRegister }) {
  const [form, setForm] = useState({ email: "", password: "" });
  function submit(event) {
    event.preventDefault();
    onSubmit({ ...form, email: form.email.trim() });
  }
  return <section className="auth-layout"><div className="auth-aside"><p className="eyebrow">RESQLINK RESPONSE NETWORK</p><h1>Clear signals.<br /><em>Faster help.</em></h1><p>A shared space for communities to coordinate urgent needs and available support.</p><div className="auth-aside-rule" /><span>One network. Faster response.</span></div><form className="auth-form" onSubmit={submit}><p className="eyebrow">MEMBER ACCESS</p><h2>Welcome back</h2><p className="auth-intro">Sign in to access your response workspace.</p>{error && <div className="notice notice-error" role="alert">{error}</div>}<label className="field" htmlFor="login-email"><span>Email address</span><input id="login-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="field" htmlFor="login-password"><span>Password</span><input id="login-password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><button className="button button-alert auth-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button><p className="auth-switch">New to the network? <button type="button" onClick={onRegister}>Create an account</button></p></form></section>;
}

export default Login;