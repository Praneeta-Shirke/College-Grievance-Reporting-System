import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const Navbar = ({ onOpenProfile }) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <header className="navbar">
      <div>
        <h1>College Grievance Reporting</h1>
        <p>
          {user?.name} | {user?.role}
          {user?.department?.name ? ` | ${user.department.name}` : ""}
        </p>
      </div>
      <div className="profile-menu-wrap" ref={menuRef}>
        <button className="ghost profile-trigger" onClick={() => setOpen((v) => !v)} title="Profile">
          <span className="profile-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
            </svg>
          </span>
          Profile
        </button>
        {open && (
          <div className="profile-menu panel">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setOpen(false);
                onOpenProfile();
              }}
            >
              Edit Profile
            </button>
            <button type="button" className="ghost" onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
