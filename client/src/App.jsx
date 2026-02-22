import { useState } from "react";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import Dashboard from "./pages/Dashboard";
import { useAuth } from "./context/AuthContext";

const App = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState("login");

  if (user) return <Dashboard />;

  return (
    <div className="auth-shell">
      <div className="brand panel">
        <h1>College Grievance Reporting</h1>
        <p>Transparent complaint handling from student to department to committee.</p>
      </div>

      <div className="tabs">
        <button className={mode === "login" ? "active" : "ghost"} onClick={() => setMode("login")}>
          Login
        </button>
        <button className={mode === "register" ? "active" : "ghost"} onClick={() => setMode("register")}>
          Register
        </button>
      </div>

      {mode === "login" ? <LoginForm /> : <RegisterForm />}
    </div>
  );
};

export default App;
