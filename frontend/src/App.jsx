import { useEffect, useState } from "react";
import { api, apiRequest, authToken } from "./api";
import Login from "./pages/Login";
import Register from "./pages/Register";

const idOf = (record) => record?._id || record?.id;
const dateOf = (date) => date ? new Date(date).toLocaleDateString() : "—";
const statuses = ["pending", "accepted", "in_progress", "completed", "rejected"];

function Status({ value, priority = false }) {
  const key = String(value || "pending").toLowerCase().replaceAll("_", "-");
  const label = value === "approved" ? "accepted" : String(value || "pending").replaceAll("_", " ");
  return <span className={`status ${priority ? "priority" : ""} status-${key}`}>{label}</span>;
}

function Field({ label, name, value, onChange, type = "text", required = true, options, placeholder, min }) {
  const props = { id: name, name, value, onChange, required, placeholder, min };
  return <label className="field" htmlFor={name}><span>{label}</span>{options ? <select {...props}><option value="">Choose {label.toLowerCase()}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : type === "textarea" ? <textarea {...props} rows="4" /> : <input {...props} type={type} />}</label>;
}

function Empty({ children }) { return <div className="empty-state"><span>—</span><p>{children}</p></div>; }
function Loading() { return <div className="loading-state" role="status"><span className="loading-bar" />Loading network data…</div>; }
function Metric({ label, value, loading }) { return <div className="metric"><strong>{loading ? "…" : Number.isFinite(value) ? value : "—"}</strong><span>{label}</span></div>; }

function App() {
  const [page, setPage] = useState(() => location.hash.slice(1) || "home");
  const [user, setUser] = useState(null);
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);

  function navigate(next) {
    location.hash = next;
    setPage(next);
    setError("");
  }

  function success(message) {
    setFlash(message);
    window.setTimeout(() => setFlash(""), 4000);
  }

  function logout() {
    authToken.clear();
    setUser(null);
    setData({});
    navigate("home");
  }

  useEffect(() => {
    const routeChanged = () => setPage(location.hash.slice(1) || "home");
    addEventListener("hashchange", routeChanged);
    if (authToken.get()) api("/auth/me").then((result) => setUser(result.user)).catch(() => authToken.clear());
    return () => removeEventListener("hashchange", routeChanged);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        let result = {};
        if (page === "home") {
          const [overview, resources, volunteers] = await Promise.all([api("/public/overview"), api("/resources"), api("/volunteers")]);
          result = { overview: overview.overview, resources: resources.resources, volunteers: volunteers.volunteers };
        } else if (["dashboard", "requests"].includes(page) && user) {
          const [requests, resources] = await Promise.all([api("/requests"), api("/resources")]);
          result = { requests: requests.requests, resources: resources.resources };
        } else if (page === "resources") {
          const response = user?.role === "admin" ? await api("/admin/resources") : await api("/resources");
          result = { resources: response.resources };
        } else if (page === "volunteer") {
          const [response, assigned] = await Promise.all([api("/volunteers"), user?.role === "volunteer" ? api("/requests") : Promise.resolve({ requests: [] })]);
          result = { volunteers: response.volunteers, assignments: assigned.requests };
        } else if (page === "admin" && user?.role === "admin") {
          const [dashboard, users, requests, resources, volunteers] = await Promise.all([api("/admin/dashboard"), api("/admin/users"), api("/admin/requests"), api("/admin/resources"), api("/admin/volunteers")]);
          result = { dashboard: dashboard.dashboard, users: users.users, requests: requests.requests, resources: resources.resources, volunteers: volunteers.volunteers };
        } else if (page === "profile" && user) {
          const [profile, volunteers] = await Promise.all([api(`/users/${idOf(user)}`), user.role === "volunteer" ? api("/volunteers") : Promise.resolve({ volunteers: [] })]);
          result = { profile: profile.user, volunteer: volunteers.volunteers?.find((item) => idOf(item.user) === idOf(user)) || null };
        }
        if (active) setData(result);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, user, refresh]);

  async function perform(action, message) {
    setBusy(true);
    setError("");
    try { await action(); setRefresh((count) => count + 1); success(message); return true; }
    catch (actionError) { setError(actionError.message); return false; }
    finally { setBusy(false); }
  }

  function startSession(result) {
    authToken.set(result.token);
    setUser(result.user);
    navigate("dashboard");
  }

  const login = (form) => perform(async () => startSession(await apiRequest("/auth/login", "POST", form)), "Welcome back.");
  const register = (form) => perform(async () => startSession(await apiRequest("/auth/register", "POST", form)), "Your account is ready.");
  const submitRequest = (form) => perform(async () => {
    await apiRequest("/requests", "POST", { ...form, peopleAffected: Number(form.peopleAffected) });
    navigate("requests");
  }, "Emergency request submitted.");
  const saveResource = (form, resource) => perform(() => apiRequest(resource ? `/resources/${resource}` : "/resources", resource ? "PUT" : "POST", { ...form, quantity: Number(form.quantity), availability: form.availability === "true" }), resource ? "Resource updated." : "Resource added.");
  const remove = (path, message) => {
    if (confirm("Delete this record? This action cannot be undone.")) perform(() => apiRequest(path, "DELETE"), message);
  };
  const setRequest = (request, status, assignment = {}) => perform(() => apiRequest(`/requests/${idOf(request)}`, "PUT", { status, ...assignment }), "Request coordination updated.");
  const saveVolunteer = (form, volunteer) => perform(() => apiRequest(volunteer ? `/volunteers/${volunteer}` : "/volunteers", volunteer ? "PUT" : "POST", { ...form, skills: form.skills.split(",").map((item) => item.trim()).filter(Boolean), availability: form.availability === "true" }), "Volunteer profile saved.");
  const requestList = data.requests || [];
  const resourceList = data.resources || [];
  const id = idOf(user);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => navigate("home")}><span className="brand-mark">R</span><span>ResQLInk<small>RESPONSE NETWORK</small></span></a>
        <nav className="main-nav" aria-label="Main navigation">{(user ? [["dashboard", "Dashboard"], ["requests", "My requests"], ["new-request", "Request help"], ["resources", "Resources"], ...(user.role === "volunteer" || user.role === "admin" ? [["volunteer", "Volunteers"]] : []), ...(user.role === "admin" ? [["admin", "Administration"]] : []), ["profile", "Profile"]] : [["home", "Overview"], ["resources", "Resources"], ["volunteer", "Volunteers"]]).map(([key, label]) => <a key={key} className={`nav-link ${page === key ? "active" : ""}`} href={`#${key}`} onClick={() => navigate(key)}>{label}</a>)}</nav>
        <div className="account-nav">{user ? <><span className="account-name">{user.name}</span><button className="button button-quiet" onClick={logout}>Sign out</button></> : <><button className="button button-quiet" onClick={() => navigate("login")}>Sign in</button><button className="button button-dark" onClick={() => navigate("register")}>Join network</button></>}</div>
      </header>
      {flash && <div className="toast" role="status">{flash}</div>}
      <main className="main-content">
        {error && page !== "login" && page !== "register" && <div className="notice notice-error page-notice" role="alert">{error}</div>}
        {page === "home" && <Home overview={data.overview} resources={resourceList} volunteers={data.volunteers || []} loading={loading} navigate={navigate} />}
        {page === "login" && <Login onSubmit={login} busy={busy} error={error} onRegister={() => navigate("register")} />}
        {page === "register" && <Register onSubmit={register} busy={busy} error={error} onLogin={() => navigate("login")} />}
        {page === "dashboard" && (user ? <Dashboard user={user} requests={requestList} resources={resourceList} loading={loading} navigate={navigate} detail={setSelectedRequest} /> : <SignInPrompt navigate={navigate} />)}
        {page === "new-request" && (user ? <RequestForm busy={busy} submit={submitRequest} /> : <SignInPrompt navigate={navigate} />)}
        {page === "requests" && (user ? <RequestsPage requests={requestList} loading={loading} detail={setSelectedRequest} remove={(request) => remove(`/requests/${idOf(request)}`, "Request deleted.")} /> : <SignInPrompt navigate={navigate} />)}
        {page === "resources" && <ResourcesPage resources={resourceList} loading={loading} user={user} busy={busy} save={saveResource} remove={(resource) => remove(`/resources/${idOf(resource)}`, "Resource deleted.")} />}
        {page === "volunteer" && <VolunteerPage volunteers={data.volunteers || []} assignments={data.assignments || []} loading={loading} user={user} navigate={navigate} detail={setSelectedRequest} />}
        {page === "profile" && (user ? <ProfilePage user={data.profile || user} volunteer={data.volunteer} busy={busy} saveProfile={(form) => perform(async () => { const result = await apiRequest(`/users/${id}`, "PUT", form); setUser({ ...user, ...result.user }); }, "Profile updated.")} saveVolunteer={saveVolunteer} changePassword={(form) => perform(() => apiRequest("/auth/password", "PUT", form), "Password changed.")} logout={logout} /> : <SignInPrompt navigate={navigate} />)}
        {page === "admin" && (user?.role === "admin" ? <AdminPage data={data} loading={loading} removeUser={(record) => remove(`/users/${idOf(record)}`, "User deleted.")} setRequest={setRequest} removeRequest={(record) => remove(`/requests/${idOf(record)}`, "Request deleted.")} removeResource={(record) => remove(`/resources/${idOf(record)}`, "Resource deleted.")} /> : <SignInPrompt navigate={navigate} />)}
      </main>
      {selectedRequest && <RequestDetails request={selectedRequest} close={() => setSelectedRequest(null)} />}
      <footer className="footer"><span>ResQLInk · Emergency Resource Coordination</span><span>One network. Faster response.</span></footer>
    </div>
  );
}

function Home({ overview, resources, volunteers, loading, navigate }) {
  return <>
    <section className="hero-band"><div className="hero-copy"><p className="eyebrow"><i className="pulse-dot" /> COMMUNITY RESPONSE NETWORK</p><h1>When every minute matters, <em>coordination does too.</em></h1><p className="hero-description">Bring urgent needs, local resources, and ready volunteers into one clear view. Help your community respond with focus.</p><div className="hero-actions"><button className="button button-alert" onClick={() => navigate("new-request")}>Request emergency help <span>↗</span></button><button className="button button-outline" onClick={() => navigate("resources")}>Offer resources</button></div><p className="hero-footnote">For urgent, life-threatening danger, contact your local emergency services first.</p></div><div className="hero-visual"><div className="visual-topline"><span>NETWORK STATUS</span><span className="online-label"><i /> OPERATIONAL</span></div><div className="network-grid"><div className="network-ring ring-one" /><div className="network-ring ring-two" /><div className="network-core">R</div><div className="network-node node-a">NEEDS</div><div className="network-node node-b">SUPPLIES</div><div className="network-node node-c">PEOPLE</div><div className="network-line line-a" /><div className="network-line line-b" /><div className="network-line line-c" /></div><div className="visual-caption"><span>CONNECTED LOCAL RESPONSE</span><span>01 — 03</span></div></div></section>
    <section className="metrics-strip"><Metric label="Open requests" value={overview?.requests} loading={loading} /><Metric label="Available resources" value={overview?.activeResources} loading={loading} /><Metric label="Ready volunteers" value={overview?.availableVolunteers} loading={loading} /><Metric label="Resources listed" value={overview?.resources} loading={loading} /></section>
    <section className="section-block response-section"><div className="section-heading"><div><p className="eyebrow">EMERGENCY REQUESTS</p><h2>Response activity</h2></div><span className="live-label"><i /> LIVE COUNTS</span></div><div className="response-counts"><div><span>Awaiting coordination</span><strong>{loading ? "…" : overview?.pendingRequests ?? "—"}</strong></div><div><span>In active response</span><strong>{loading ? "…" : overview?.activeRequests ?? "—"}</strong></div><div><span>Successfully completed</span><strong>{loading ? "…" : overview?.completedRequests ?? "—"}</strong></div></div></section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">CURRENT CAPACITY</p><h2>Resources in the network</h2></div><button className="text-action" onClick={() => navigate("resources")}>Browse resources →</button></div>{loading ? <Loading /> : resources.length ? <div className="resource-grid">{resources.slice(0, 4).map((item) => <ResourceCard key={idOf(item)} resource={item} />)}</div> : <Empty>No shared resources have been listed yet.</Empty>}</section>
    <section className="section-block network-section"><div className="section-heading"><div><p className="eyebrow">PEOPLE MAKE THE NETWORK</p><h2>Volunteers ready to respond</h2></div><button className="text-action" onClick={() => navigate("volunteer")}>Volunteer network →</button></div>{loading ? <Loading /> : volunteers.length ? <div className="volunteer-row">{volunteers.slice(0, 4).map((item) => <VolunteerSummary key={idOf(item)} volunteer={item} />)}</div> : <Empty>No volunteer profiles are available yet.</Empty>}</section>
  </>;
}

function ResourceCard({ resource, actions }) {
  return <article className="resource-card"><div className="resource-symbol">{resource.category?.slice(0, 1) || "R"}</div><div className="resource-card-main"><p className="eyebrow">{resource.category}</p><h3>{resource.name}</h3><p>{resource.location}</p><small>Provider: {resource.providedBy?.name || "Community network"}</small></div><div className="resource-quantity"><strong>{resource.quantity}</strong><span>{resource.availability ? "Available" : "Unavailable"}</span></div>{actions}</article>;
}

function VolunteerSummary({ volunteer }) {
  return <div className="volunteer-chip"><span className="avatar-mark">{volunteer.user?.name?.slice(0, 1) || "V"}</span><span><strong>{volunteer.user?.name || "Volunteer"}</strong><small>{volunteer.location} · {volunteer.availability ? "Available" : "Unavailable"}</small></span><Status value={volunteer.status} /></div>;
}

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

function Dashboard({ user, requests, resources, loading, navigate, detail }) {
  const open = requests.filter((item) => !["completed", "rejected"].includes(item.status)).length;
  return <div className="page-wrap"><PageHeading eyebrow={`${user.role} workspace`} title={`Good to see you, ${user.name.split(" ")[0]}.`} description="Your activity and local response capacity, together." action={<button className="button button-alert" onClick={() => navigate("new-request")}>＋ New request</button>} /><div className="metrics-strip dashboard-metrics"><Metric label="My requests" value={requests.length} loading={loading} /><Metric label="Open requests" value={open} loading={loading} /><Metric label="Available resources" value={resources.filter((item) => item.availability && item.quantity > 0).length} loading={loading} /></div><div className="dashboard-columns"><section className="content-panel"><div className="panel-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>My emergency requests</h2></div><button className="text-action" onClick={() => navigate("requests")}>All requests →</button></div>{loading ? <Loading /> : requests.length ? <RequestTable requests={requests.slice(0, 5)} detail={detail} /> : <Empty>You haven’t submitted an emergency request.</Empty>}</section><section className="content-panel"><div className="panel-heading"><div><p className="eyebrow">NEARBY CAPACITY</p><h2>Shared resources</h2></div><button className="text-action" onClick={() => navigate("resources")}>Browse →</button></div>{loading ? <Loading /> : resources.length ? <div className="compact-list">{resources.slice(0, 5).map((item) => <div className="compact-item" key={idOf(item)}><span className="resource-symbol small-symbol">{item.category?.slice(0, 1)}</span><span><strong>{item.name}</strong><small>{item.location}</small></span><Status value={item.availability && item.quantity > 0 ? "available" : "unavailable"} /></div>)}</div> : <Empty>No resources listed.</Empty>}</section></div></div>;
}

function RequestForm({ busy, submit }) {
  const [form, setForm] = useState({ title: "", type: "", description: "", location: "", priority: "medium", peopleAffected: "1", requiredResource: "" });
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  return <div className="page-wrap form-page"><PageHeading eyebrow="EMERGENCY INTAKE" title="Request help" description="Share the situation and what your community needs. A coordinator can review and route your request." /><form className="form-panel" onSubmit={(event) => { event.preventDefault(); submit(form); }}><div className="form-grid"><Field label="Request title" name="title" value={form.title} onChange={change} placeholder="Drinking water for temporary shelter" /><Field label="Emergency type" name="type" value={form.type} onChange={change} options={["Flood", "Fire", "Medical", "Severe weather", "Power outage", "Food insecurity", "Other"].map((item) => ({ value: item, label: item }))} /><Field label="Location" name="location" value={form.location} onChange={change} placeholder="Town, neighborhood, or address" /><Field label="Priority" name="priority" value={form.priority} onChange={change} options={["critical", "high", "medium", "low"].map((item) => ({ value: item, label: item[0].toUpperCase() + item.slice(1) }))} /><Field label="People affected" name="peopleAffected" type="number" min="1" value={form.peopleAffected} onChange={change} /><Field label="Most needed resource" name="requiredResource" value={form.requiredResource} onChange={change} placeholder="Bottled water, transport…" /><div className="field-span"><Field label="Situation details" name="description" type="textarea" value={form.description} onChange={change} placeholder="What is happening? Include details that help responders assess the need." /></div></div><div className="form-footer"><span>Critical emergencies should also be reported to local emergency services.</span><button className="button button-alert" disabled={busy}>{busy ? "Submitting…" : "Submit request"}</button></div></form></div>;
}

function RequestTable({ requests, detail, remove }) {
  return <div className="table-scroll"><table><thead><tr><th>Request</th><th>Location</th><th>Priority</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>{requests.map((item) => <tr key={idOf(item)}><td><button className="table-primary" onClick={() => detail(item)}>{item.title}</button><small>{item.type}</small></td><td>{item.location}</td><td><Status value={item.priority} priority /></td><td><Status value={item.status} /></td><td>{dateOf(item.createdAt)}</td><td><button className="small-action" onClick={() => detail(item)}>Details</button>{remove && item.status === "pending" && <button className="small-action danger-text" onClick={() => remove(item)}>Delete</button>}</td></tr>)}</tbody></table></div>;
}

function RequestsPage({ requests, loading, detail, remove }) {
  return <div className="page-wrap"><PageHeading eyebrow="REQUEST TRACKING" title="My requests" description="Follow status updates and review what has been submitted." action={<a className="button button-alert button-link" href="#new-request">＋ New request</a>} />{loading ? <Loading /> : requests.length ? <section className="content-panel"><RequestTable requests={requests} detail={detail} remove={remove} /></section> : <Empty>No requests yet. When you submit one, its status will appear here.</Empty>}</div>;
}

function ResourcesPage({ resources, loading, user, busy, save, remove }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", quantity: "", location: "", availability: "true" });
  function startEdit(item) { setEditing(item); setForm({ name: item.name, category: item.category, quantity: item.quantity, location: item.location, availability: String(item.availability) }); }
  async function submit(event) { event.preventDefault(); if (await save(form, editing ? idOf(editing) : null)) { setEditing(null); setForm({ name: "", category: "", quantity: "", location: "", availability: "true" }); } }
  const owns = (item) => user?.role === "admin" || idOf(item.providedBy) === idOf(user);
  return <div className="page-wrap"><PageHeading eyebrow="SHARED INVENTORY" title="Resources" description="See what is available nearby, or list supplies and services your organization can provide." />{user && <form className="inline-form content-panel" onSubmit={submit}><div className="panel-heading"><div><p className="eyebrow">{editing ? "UPDATE LISTING" : "CONTRIBUTE"}</p><h2>{editing ? "Edit resource" : "Add a resource"}</h2></div>{editing && <button className="text-action" type="button" onClick={() => setEditing(null)}>Cancel edit</button>}</div><div className="form-grid compact-grid"><Field label="Resource name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Potable water" /><Field label="Category" name="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Water, medical, transport" /><Field label="Quantity" name="quantity" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /><Field label="Location" name="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><Field label="Availability" name="availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} options={[{ value: "true", label: "Available" }, { value: "false", label: "Unavailable" }]} /></div><div className="form-footer"><span>Only you and administrators can change this listing.</span><button className="button button-dark" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Publish resource"}</button></div></form>}{loading ? <Loading /> : resources.length ? <div className="resource-grid inventory-grid">{resources.map((item) => <ResourceCard key={idOf(item)} resource={item} actions={user && owns(item) && <div className="resource-actions"><button className="small-action" onClick={() => startEdit(item)}>Edit</button><button className="small-action danger-text" onClick={() => remove(item)}>Delete</button></div>} />)}</div> : <Empty>No resources are listed in the network yet.</Empty>}</div>;
}

function VolunteerPage({ volunteers, assignments, loading, user, navigate, detail }) {
  return <div className="page-wrap"><PageHeading eyebrow="COMMUNITY RESPONDERS" title="Volunteer network" description="People with local knowledge and practical skills help connect needs to the right response." action={user?.role === "volunteer" ? <button className="button button-dark" onClick={() => navigate("profile")}>Update my profile</button> : !user ? <button className="button button-dark" onClick={() => navigate("register")}>Join as a volunteer</button> : null} />{user?.role === "volunteer" && <section className="content-panel assignment-list"><div className="panel-heading"><div><p className="eyebrow">YOUR FIELD WORK</p><h2>Emergency assignments</h2></div></div>{loading ? <Loading /> : assignments.length ? <div className="assignment-cards">{assignments.map((item) => <article className="assignment-card" key={idOf(item)}><div><p className="eyebrow">{item.type} · {item.location}</p><h3>{item.title}</h3><p>{item.peopleAffected} affected · Resource needed: {item.requiredResource}</p></div><div className="assignment-card-actions"><Status value={item.priority} priority /><Status value={item.status} /><button className="small-action" onClick={() => detail(item)}>View details</button></div></article>)}</div> : <Empty>No emergency assignments are currently linked to your profile.</Empty>}</section>}{loading ? <Loading /> : volunteers.length ? <div className="volunteer-list">{volunteers.map((item) => <article className="volunteer-card" key={idOf(item)}><span className="avatar-mark large-avatar">{item.user?.name?.slice(0, 1) || "V"}</span><div className="volunteer-info"><h3>{item.user?.name || "Volunteer"}</h3><p>{item.location}</p><div className="skill-list">{item.skills?.map((skill) => <span key={skill}>{skill}</span>)}</div></div><div className="volunteer-status"><Status value={item.status} /><small>{item.availability ? "Available for assignments" : "Not currently available"}</small></div></article>)}</div> : <Empty>No volunteer profiles yet. Registered volunteers can add theirs from the profile page.</Empty>}</div>;
}

function ProfilePage({ user, volunteer, busy, saveProfile, saveVolunteer, changePassword, logout }) {
  const [form, setForm] = useState({ name: user.name || "", email: user.email || "", phone: user.phone || "" });
  const [volunteerForm, setVolunteerForm] = useState({ location: volunteer?.location || "", skills: volunteer?.skills?.join(", ") || "", availability: String(volunteer?.availability ?? true) });
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [notice, setNotice] = useState("");
  async function change(event) { event.preventDefault(); if (password.newPassword !== password.confirmPassword) { setNotice("New passwords do not match."); return; } const saved = await changePassword({ currentPassword: password.currentPassword, newPassword: password.newPassword }); if (saved) { setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" }); setNotice("Password changed."); } }
  return <div className="page-wrap"><PageHeading eyebrow="ACCOUNT SETTINGS" title="Your profile" description="Manage contact details and account security." action={<button className="button button-quiet" onClick={logout}>Sign out</button>} /><div className="dashboard-columns"><form className="content-panel settings-panel" onSubmit={(e) => { e.preventDefault(); saveProfile(form); }}><div className="panel-heading"><div><p className="eyebrow">PERSONAL DETAILS</p><h2>Contact information</h2></div><Status value={user.role} /></div><div className="form-stack"><Field label="Full name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Field label="Email address" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><Field label="Phone" name="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><div className="form-footer"><span>Account type: {user.role}</span><button className="button button-dark" disabled={busy}>Save profile</button></div></form><form className="content-panel settings-panel" onSubmit={change}><div className="panel-heading"><div><p className="eyebrow">ACCOUNT SECURITY</p><h2>Change password</h2></div></div>{notice && <div className="notice notice-success">{notice}</div>}<div className="form-stack"><Field label="Current password" name="currentPassword" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} /><Field label="New password" name="newPassword" type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} /><Field label="Confirm new password" name="confirmPassword" type="password" value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} /></div><div className="form-footer"><span>Use at least 8 characters.</span><button className="button button-dark" disabled={busy}>Update password</button></div></form></div>{user.role === "volunteer" && <form className="content-panel volunteer-profile-form" onSubmit={(e) => { e.preventDefault(); saveVolunteer(volunteerForm, volunteer ? idOf(volunteer) : null); }}><div className="panel-heading"><div><p className="eyebrow">VOLUNTEER DETAILS</p><h2>Response availability</h2></div><Status value={volunteer?.status || "profile needed"} /></div><div className="form-grid"><Field label="Service location" name="location" value={volunteerForm.location} onChange={(e) => setVolunteerForm({ ...volunteerForm, location: e.target.value })} /><Field label="Skills (comma separated)" name="skills" required={false} value={volunteerForm.skills} onChange={(e) => setVolunteerForm({ ...volunteerForm, skills: e.target.value })} placeholder="First aid, logistics, translation" /><Field label="Availability" name="availability" value={volunteerForm.availability} onChange={(e) => setVolunteerForm({ ...volunteerForm, availability: e.target.value })} options={[{ value: "true", label: "Available" }, { value: "false", label: "Unavailable" }]} /></div><div className="form-footer"><span>Keep your location and availability current.</span><button className="button button-dark" disabled={busy}>Save volunteer details</button></div></form>}</div>;
}

function AdminPage({ data, loading, removeUser, setRequest, removeRequest, removeResource }) {
  const [assignments, setAssignments] = useState({});
  const metrics = data.dashboard || {};
  return <div className="page-wrap"><PageHeading eyebrow="COORDINATION CONSOLE" title="Administration" description="Monitor platform activity and coordinate requests, resources, and volunteer assignments." /><div className="admin-metrics">{[["Users", "totalUsers"], ["Volunteers", "totalVolunteers"], ["Resources", "totalResources"], ["All requests", "totalRequests"], ["Pending", "pendingRequests"], ["Active", "activeRequests"], ["Completed", "completedRequests"]].map(([label, key]) => <div className="admin-metric" key={key}><strong>{loading ? "…" : metrics[key] ?? "—"}</strong><span>{label}</span></div>)}</div><section className="content-panel admin-panel"><div className="panel-heading"><div><p className="eyebrow">TRIAGE AND ASSIGNMENT</p><h2>Emergency requests</h2></div></div>{loading ? <Loading /> : data.requests?.length ? <div className="admin-request-list">{data.requests.map((request) => <AdminRequest key={idOf(request)} request={request} volunteers={data.volunteers || []} resources={data.resources || []} assignment={assignments[idOf(request)] || {}} onChange={(value) => setAssignments({ ...assignments, [idOf(request)]: { ...assignments[idOf(request)], ...value } })} save={(status) => setRequest(request, status, assignments[idOf(request)] || {})} remove={() => removeRequest(request)} />)}</div> : <Empty>No emergency requests have been submitted.</Empty>}</section><div className="dashboard-columns"><section className="content-panel"><div className="panel-heading"><div><p className="eyebrow">ACCOUNT ACCESS</p><h2>Users</h2></div></div>{loading ? <Loading /> : data.users?.length ? <div className="compact-list">{data.users.map((item) => <div className="compact-item" key={idOf(item)}><span className="avatar-mark">{item.name?.slice(0, 1)}</span><span><strong>{item.name}</strong><small>{item.email} · {item.role}</small></span>{item.role !== "admin" && <button className="small-action danger-text" onClick={() => removeUser(item)}>Remove</button>}</div>)}</div> : <Empty>No users found.</Empty>}</section><section className="content-panel"><div className="panel-heading"><div><p className="eyebrow">SUPPLY NETWORK</p><h2>Resources</h2></div></div>{loading ? <Loading /> : data.resources?.length ? <div className="compact-list">{data.resources.map((item) => <div className="compact-item" key={idOf(item)}><span className="resource-symbol small-symbol">{item.category?.slice(0, 1)}</span><span><strong>{item.name}</strong><small>{item.quantity} · {item.location}</small></span><button className="small-action danger-text" onClick={() => removeResource(item)}>Delete</button></div>)}</div> : <Empty>No resources listed.</Empty>}</section></div><section className="content-panel"><div className="panel-heading"><div><p className="eyebrow">FIELD CAPACITY</p><h2>Volunteer assignments</h2></div></div>{loading ? <Loading /> : data.volunteers?.length ? <div className="volunteer-row">{data.volunteers.map((item) => <VolunteerSummary key={idOf(item)} volunteer={item} />)}</div> : <Empty>No volunteer profiles registered.</Empty>}</section></div>;
}

function AdminRequest({ request, volunteers, resources, assignment, onChange, save, remove }) {
  return <article className="admin-request"><div className="admin-request-top"><div><p className="eyebrow">{request.type} · {request.location}</p><h3>{request.title}</h3><p>{request.requestedBy?.name} · {request.peopleAffected} affected · {request.requiredResource}</p></div><Status value={request.priority} priority /></div><div className="admin-request-tools"><label className="field mini-field"><span>Request status</span><select value={assignment.status || request.status} onChange={(e) => onChange({ status: e.target.value })}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label><label className="field mini-field"><span>Assign volunteer</span><select value={assignment.assignedVolunteer ?? idOf(request.assignedVolunteer) ?? ""} onChange={(e) => onChange({ assignedVolunteer: e.target.value || null })}><option value="">No volunteer</option>{volunteers.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.user?.name} · {item.location}</option>)}</select></label><label className="field mini-field"><span>Assign resource</span><select value={assignment.assignedResource ?? idOf(request.assignedResource) ?? ""} onChange={(e) => onChange({ assignedResource: e.target.value || null })}><option value="">No resource</option>{resources.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.name} · {item.quantity}</option>)}</select></label><button className="button button-dark assignment-button" onClick={() => save(assignment.status || request.status)}>Save coordination</button><button className="small-action danger-text admin-delete" onClick={remove}>Delete request</button></div></article>;
}

function RequestDetails({ request, close }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><section className="request-dialog" role="dialog" aria-modal="true" aria-labelledby="request-title"><div className="dialog-heading"><div><p className="eyebrow">REQUEST DETAILS</p><h2 id="request-title">{request.title}</h2></div><button className="icon-button" aria-label="Close details" onClick={close}>×</button></div><div className="dialog-status"><Status value={request.priority} priority /><Status value={request.status} /></div><p className="dialog-description">{request.description}</p><dl className="detail-list">{[["Emergency type", request.type], ["Location", request.location], ["People affected", request.peopleAffected], ["Required resource", request.requiredResource], ["Submitted", dateOf(request.createdAt)], ["Request ID", idOf(request)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><button className="button button-dark dialog-close" onClick={close}>Close</button></section></div>;
}

function SignInPrompt({ navigate }) { return <div className="page-wrap"><div className="prompt-panel"><p className="eyebrow">MEMBER ACCESS</p><h1>Sign in to continue</h1><p>This part of the response network is available to registered members.</p><button className="button button-dark" onClick={() => navigate("login")}>Sign in</button></div></div>; }

export default App;