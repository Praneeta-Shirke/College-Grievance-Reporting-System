import { useState } from "react";
import api from "../api";

const AdminUserForm = ({ departments }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [departmentId, setDepartmentId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      setLoading(true);
      await api.post("/auth/admin/create-user", {
        name,
        email,
        password,
        role,
        departmentId: role === "staff" ? departmentId : undefined
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("staff");
      setDepartmentId("");
      setMessage("User created successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="panel form" onSubmit={submit}>
      <h3>Create Staff/Admin</h3>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Temporary password"
        type="password"
        required
      />
      <select value={role} onChange={(e) => setRole(e.target.value)} required>
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
      </select>
      {role === "staff" && (
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
          <option value="">Select Department</option>
          {departments.map((dep) => (
            <option key={dep._id} value={dep._id}>
              {dep.name}
            </option>
          ))}
        </select>
      )}
      {error && <p className="error">{error}</p>}
      {message && <p className="meta">{message}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create User"}
      </button>
    </form>
  );
};

export default AdminUserForm;
