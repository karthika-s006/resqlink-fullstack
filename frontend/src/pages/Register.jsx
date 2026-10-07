import { useState } from "react";

function Register({ onSubmit, busy, error, onLogin }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", role: "user" });
  const [validation, setValidation] = useState("");
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  function submit(event) {
    event.preventDefault();
    setValidation("");
    if (form.password.length < 8) { setValidation("Use at least 8 characters for your password."); return; }
    if (form.password !== form.confirmPassword) { setValidation("Your passwords do not match."); return; }
    onSubmit({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password, role: form.role });
  }
  return <section className="auth-layout register-layout"><div className="auth-aside"><p className="eyebrow">JOIN THE RESPONSE NETWORK</p><h1>Make local<br /><em>capacity visible.</em></h1><p>Coordinate what your community needs with the people and supplies ready to help.</p><div className="auth-aside-rule" /><span>People · Resources · Response</span></div><form className="auth-form" onSubmit={submit}><p className="eyebrow">CREATE YOUR ACCOUNT</p><h2>Join ResQLInk</h2><p className="auth-intro">Choose how you’ll take part in the network.</p>{(error || validation) && <div className="notice notice-error" role="alert">{validation || error}</div>}<label className="field" htmlFor="register-name"><span>Full name</span><input id="register-name" name="name" autoComplete="name" required maxLength="100" value={form.name} onChange={change} /></label><div className="form-grid auth-grid"><label className="field" htmlFor="register-email"><span>Email address</span><input id="register-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={change} /></label><label className="field" htmlFor="register-phone"><span>Phone</span><input id="register-phone" name="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={change} /></label></div><label className="field" htmlFor="register-role"><span>Account type</span><select id="register-role" name="role" value={form.role} onChange={change}><option value="user">Community member</option><option value="volunteer">Volunteer</option><option value="organization">Organization</option></select></label><div className="form-grid auth-grid"><label className="field" htmlFor="register-password"><span>Password</span><input id="register-password" name="password" type="password" autoComplete="new-password" minLength="8" required value={form.password} onChange={change} /></label><label className="field" htmlFor="register-confirm"><span>Confirm password</span><input id="register-confirm" name="confirmPassword" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={change} /></label></div><button className="button button-alert auth-submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button><p className="auth-switch">Already registered? <button type="button" onClick={onLogin}>Sign in</button></p></form></section>;
}

export default Register;