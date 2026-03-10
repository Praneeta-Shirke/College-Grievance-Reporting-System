import { useMemo, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const classOptions = ["Bsc CS", "Bsc EC", "B.Com", "B.Sc BioTech", "B.A Arts", "B.Sc Chemistry"];
const batchOptions = ["2024", "2025", "2026", "2027", "2028", "2029", "2030"];

const toDateInput = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const ProfilePanel = ({ onBack }) => {
  const { user, login, logout, token } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    currentAddress: user?.currentAddress || "",
    birthDate: toDateInput(user?.birthDate),
    className: user?.className || "",
    batch: user?.batch || ""
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isStudent = useMemo(() => user?.role === "student", [user?.role]);

  const onSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        currentAddress: form.currentAddress,
        birthDate: form.birthDate || null,
        ...(isStudent ? { className: form.className, batch: form.batch } : {})
      };
      const { data } = await api.patch("/auth/me", payload);
      login(token, data);
      setMessage("Profile updated successfully");
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!currentPassword) {
      setError("Enter current password to delete account");
      return;
    }
    const ok = window.confirm("Delete your account permanently? This action cannot be undone.");
    if (!ok) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.request({ method: "delete", url: "/auth/me", data: { currentPassword } });
      logout();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to delete account"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="list">
      <form className="panel form" onSubmit={onSave}>
        <div className="row-between">
          <h2>My Profile</h2>
          <div className="actions">
            {onBack && (
              <button type="button" className="ghost" onClick={onBack}>
                Back
              </button>
            )}
            {!editing ? (
              <button type="button" className="ghost" onClick={() => setEditing(true)}>
                Edit Profile
              </button>
            ) : (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    name: user?.name || "",
                    phone: user?.phone || "",
                    currentAddress: user?.currentAddress || "",
                    birthDate: toDateInput(user?.birthDate),
                    className: user?.className || "",
                    batch: user?.batch || ""
                  });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <input value={user?.email || ""} disabled />
        <input value={user?.collegeId || ""} disabled />
        <input value={user?.role || ""} disabled />

        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Name"
          disabled={!editing}
          required
        />
        <input
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          placeholder="Phone"
          disabled={!editing}
          required
        />
        <input
          value={form.currentAddress}
          onChange={(e) => setForm((p) => ({ ...p, currentAddress: e.target.value }))}
          placeholder="Current address"
          disabled={!editing}
          required
        />
        <input
          type="date"
          value={form.birthDate}
          onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
          disabled={!editing}
        />

        {isStudent && (
          <>
            <select
              value={form.className}
              onChange={(e) => setForm((p) => ({ ...p, className: e.target.value }))}
              disabled={!editing}
              required
            >
              <option value="">Select Class</option>
              {classOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              value={form.batch}
              onChange={(e) => setForm((p) => ({ ...p, batch: e.target.value }))}
              disabled={!editing}
              required
            >
              <option value="">Select Batch</option>
              {batchOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </>
        )}

        {error && <p className="error">{error}</p>}
        {message && <p className="meta">{message}</p>}

        {editing && (
          <button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save Changes"}
          </button>
        )}
      </form>

      <div className="panel form">
        <h3>Delete Account</h3>
        <p className="subtext">Enter your current password to permanently delete your account.</p>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
        />
        <button type="button" className="danger" onClick={onDelete} disabled={busy}>
          {busy ? "Deleting..." : "Delete Account"}
        </button>
      </div>
    </section>
  );
};

export default ProfilePanel;
