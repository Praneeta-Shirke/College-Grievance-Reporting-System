import { useState } from "react";
import api from "../api";

const AdminUserForm = ({ departments }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [phone, setPhone] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        collegeId,
        phone,
        currentAddress,
        birthDate,
        password,
        confirmPassword,
        role,
        departmentId: role === "staff" ? departmentId : undefined
      });
      setName("");
      setEmail("");
      setCollegeId("");
      setPhone("");
      setCurrentAddress("");
      setBirthDate("");
      setPassword("");
      setConfirmPassword("");
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
      <p className="subtext">Staff ID format: STF-DEPT-NNN | Admin ID format: ADM-NNNN</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
      <input
        value={collegeId}
        onChange={(e) => setCollegeId(e.target.value)}
        placeholder={role === "staff" ? "College ID (e.g., STF-CS-002)" : "College ID (e.g., ADM-1002)"}
        required
      />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" required />
      <input
        value={currentAddress}
        onChange={(e) => setCurrentAddress(e.target.value)}
        placeholder="Current address"
        required
      />
      <input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} type="date" required />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Temporary password"
        type="password"
        required
      />
      <input
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
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
