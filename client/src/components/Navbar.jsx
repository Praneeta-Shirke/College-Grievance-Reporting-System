import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div>
        <h1>College Grievance Reporting</h1>
        <p>
          {user?.name} | {user?.role}
          {user?.department?.name ? ` | ${user.department.name}` : ""}
        </p>
      </div>
      <button className="ghost" onClick={logout}>
        Logout
      </button>
    </header>
  );
};

export default Navbar;
