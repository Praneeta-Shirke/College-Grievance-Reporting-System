import { useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const classOptions = [
  "Bsc CS",
  "Bsc EC",
  "B.Com",
  "B.Sc BioTech",
  "B.A Arts",
  "B.Sc Chemistry"
];

const batchOptions = ["2024", "2025", "2026", "2027", "2028", "2029", "2030"];

const RegisterForm = () => {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [phone, setPhone] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [className, setClassName] = useState("");
  const [batch, setBatch] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/register", {
        name,
        email,
        collegeId,
        phone,
        currentAddress,
        birthDate,
        className,
        batch,
        password,
        confirmPassword
      });
      login(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>Create Student Account</h2>
      <p className="subtext">Use authorized student college ID format: STU-YYYY-NNNN.</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
      <input
        value={collegeId}
        onChange={(e) => setCollegeId(e.target.value)}
        placeholder="College ID (e.g., STU-2026-0002)"
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
      <select value={className} onChange={(e) => setClassName(e.target.value)} required>
        <option value="">Select Class</option>
        {classOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <select value={batch} onChange={(e) => setBatch(e.target.value)} required>
        <option value="">Select Batch</option>
        {batchOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
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
      {error && <p className="error">{error}</p>}
      <button type="submit">Register</button>
    </form>
  );
};

export default RegisterForm;
