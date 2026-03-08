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
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      setLoading(true);
      if (!otpSent) {
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
        setOtpSent(true);
        setMessage(data?.message || "Registration OTP sent to your email");
        return;
      }

      const { data } = await api.post("/auth/register/verify-otp", { email, otp });
      login(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>Create Student Account</h2>
      <p className="subtext">Use authorized student college ID format: STU-YYYY-NNNN. OTP verification is required.</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required disabled={otpSent} />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        required
        disabled={otpSent}
      />
      <input
        value={collegeId}
        onChange={(e) => setCollegeId(e.target.value)}
        placeholder="College ID (e.g., STU-2026-0002)"
        required
        disabled={otpSent}
      />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" required disabled={otpSent} />
      <input
        value={currentAddress}
        onChange={(e) => setCurrentAddress(e.target.value)}
        placeholder="Current address"
        required
        disabled={otpSent}
      />
      <input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} type="date" required disabled={otpSent} />
      <select value={className} onChange={(e) => setClassName(e.target.value)} required disabled={otpSent}>
        <option value="">Select Class</option>
        {classOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <select value={batch} onChange={(e) => setBatch(e.target.value)} required disabled={otpSent}>
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
        type={showPassword ? "text" : "password"}
        required
        disabled={otpSent}
      />
      {!otpSent && (
        <label>
          <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} /> Show
          password
        </label>
      )}
      <input
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        type={showConfirmPassword ? "text" : "password"}
        required
        disabled={otpSent}
      />
      {!otpSent && (
        <label>
          <input
            type="checkbox"
            checked={showConfirmPassword}
            onChange={(e) => setShowConfirmPassword(e.target.checked)}
          />{" "}
          Show confirm password
        </label>
      )}
      {otpSent && (
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter 6-digit OTP"
          required
          inputMode="numeric"
          minLength={6}
          maxLength={6}
        />
      )}
      {message && <p className="meta">{message}</p>}
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Please wait..." : otpSent ? "Verify OTP & Create Account" : "Send Registration OTP"}
      </button>
      {otpSent && (
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setOtpSent(false);
            setOtp("");
            setMessage("");
            setError("");
          }}
        >
          Edit Registration Details
        </button>
      )}
    </form>
  );
};

export default RegisterForm;
