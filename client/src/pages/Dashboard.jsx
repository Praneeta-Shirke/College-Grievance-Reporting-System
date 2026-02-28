import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import GrievanceCard from "../components/GrievanceCard";
import GrievanceForm from "../components/GrievanceForm";
import Navbar from "../components/Navbar";
import AdminUserForm from "../components/AdminUserForm";

const Dashboard = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [staffDeptGrievances, setStaffDeptGrievances] = useState([]);
  const [staffAllGrievances, setStaffAllGrievances] = useState([]);
  const [staffTab, setStaffTab] = useState("department");
  const [studentMyGrievances, setStudentMyGrievances] = useState([]);
  const [studentAllGrievances, setStudentAllGrievances] = useState([]);
  const [studentTab, setStudentTab] = useState("new");
  const [adminTab, setAdminTab] = useState("grievances");

  const socket = useMemo(
    () => io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", { autoConnect: true }),
    []
  );

  const load = async () => {
    const depReq = api.get("/departments");

    if (user.role === "student") {
      const [depRes, myRes, allRes] = await Promise.all([
        depReq,
        api.get("/grievances"),
        api.get("/grievances?scope=all")
      ]);
      setDepartments(depRes.data);
      setStudentMyGrievances(myRes.data);
      setStudentAllGrievances(allRes.data);
      return;
    }

    if (user.role === "staff") {
      const [depRes, deptRes, allRes] = await Promise.all([
        depReq,
        api.get("/grievances"),
        api.get("/grievances?scope=all")
      ]);
      setDepartments(depRes.data);
      setStaffDeptGrievances(deptRes.data);
      setStaffAllGrievances(allRes.data);
      return;
    }

    const [depRes, grievanceRes] = await Promise.all([depReq, api.get("/grievances")]);
    setDepartments(depRes.data);
    setGrievances(grievanceRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const source =
      user.role === "student"
        ? [...studentMyGrievances, ...studentAllGrievances]
        : user.role === "staff"
          ? [...staffDeptGrievances, ...staffAllGrievances]
          : grievances;
    source.forEach((g) => socket.emit("grievance:join", g._id));
  }, [grievances, socket, studentMyGrievances, studentAllGrievances, staffDeptGrievances, staffAllGrievances, user.role]);

  useEffect(() => {
    const onUpdate = ({ grievance, update }) => {
      if (user.role === "student" || user.role === "staff") {
        load();
        return;
      }

      setGrievances((prev) => {
        const idx = prev.findIndex((g) => g._id === grievance._id);
        if (idx === -1) return prev;
        const copy = [...prev];
        const current = copy[idx];
        const updates = update ? [...(current.updates || []), update] : current.updates || [];
        copy[idx] = { ...current, ...grievance, updates };
        return copy;
      });
    };

    socket.on("grievance:updated", onUpdate);
    return () => {
      socket.off("grievance:updated", onUpdate);
      socket.disconnect();
    };
  }, [socket, user.role]);

  return (
    <div className="page">
      <Navbar />

      <main className="content">
        {user.role === "student" && (
          <div className="tabs">
            <button className={studentTab === "new" ? "active" : "ghost"} onClick={() => setStudentTab("new")}>
              New Grievance
            </button>
            <button
              className={studentTab === "previous" ? "active" : "ghost"}
              onClick={() => setStudentTab("previous")}
            >
              Previous Grievances
            </button>
            <button className={studentTab === "all" ? "active" : "ghost"} onClick={() => setStudentTab("all")}>
              All Grievances
            </button>
          </div>
        )}

        {user.role === "staff" && (
          <div className="tabs">
            <button
              className={staffTab === "department" ? "active" : "ghost"}
              onClick={() => setStaffTab("department")}
            >
              Department Grievances
            </button>
            <button className={staffTab === "all" ? "active" : "ghost"} onClick={() => setStaffTab("all")}>
              All Grievances
            </button>
          </div>
        )}

        {user.role === "student" && studentTab === "new" && <GrievanceForm departments={departments} onCreated={load} />}

        {user.role === "admin" && (
          <div className="tabs">
            <button
              className={adminTab === "grievances" ? "active" : "ghost"}
              onClick={() => setAdminTab("grievances")}
            >
              Grievances
            </button>
            <button
              className={adminTab === "users" ? "active" : "ghost"}
              onClick={() => setAdminTab("users")}
            >
              New Admin/Staff
            </button>
          </div>
        )}

        {user.role === "admin" && adminTab === "users" && <AdminUserForm departments={departments} />}

        {(user.role !== "admin" || adminTab === "grievances") && user.role !== "student" && user.role !== "staff" && (
          <section className="list">
            <div className="row-between">
              <h2>Grievances</h2>
              <button className="ghost" onClick={load}>
                Refresh
              </button>
            </div>

            <div className="grid">
              {grievances.map((g) => (
                <GrievanceCard
                  key={g._id}
                  grievance={g}
                  role={user.role}
                  currentUserId={user.id}
                  currentUserDepartmentId={user.department?._id}
                  onChanged={load}
                />
              ))}
              {grievances.length === 0 && <p className="panel">No grievances found for your role.</p>}
            </div>
          </section>
        )}

        {user.role === "staff" && staffTab === "department" && (
          <section className="list">
            <div className="row-between">
              <h2>Department Grievances</h2>
              <button className="ghost" onClick={load}>
                Refresh
              </button>
            </div>
            <div className="grid">
              {staffDeptGrievances.map((g) => (
                <GrievanceCard
                  key={g._id}
                  grievance={g}
                  role={user.role}
                  currentUserId={user.id}
                  currentUserDepartmentId={user.department?._id}
                  onChanged={load}
                />
              ))}
              {staffDeptGrievances.length === 0 && <p className="panel">No department grievances found.</p>}
            </div>
          </section>
        )}

        {user.role === "staff" && staffTab === "all" && (
          <section className="list">
            <div className="row-between">
              <h2>All Grievances</h2>
              <button className="ghost" onClick={load}>
                Refresh
              </button>
            </div>
            <div className="grid">
              {staffAllGrievances.map((g) => (
                <GrievanceCard
                  key={g._id}
                  grievance={g}
                  role={user.role}
                  currentUserId={user.id}
                  currentUserDepartmentId={user.department?._id}
                  onChanged={load}
                />
              ))}
              {staffAllGrievances.length === 0 && <p className="panel">No grievances found.</p>}
            </div>
          </section>
        )}

        {user.role === "student" && studentTab === "previous" && (
          <section className="list">
            <div className="row-between">
              <h2>Your Previous Grievances</h2>
              <button className="ghost" onClick={load}>
                Refresh
              </button>
            </div>
            <div className="grid">
              {studentMyGrievances.map((g) => (
                <GrievanceCard
                  key={g._id}
                  grievance={g}
                  role={user.role}
                  currentUserId={user.id}
                  currentUserDepartmentId={user.department?._id}
                  onChanged={load}
                />
              ))}
              {studentMyGrievances.length === 0 && <p className="panel">No previous grievances found.</p>}
            </div>
          </section>
        )}

        {user.role === "student" && studentTab === "all" && (
          <section className="list">
            <div className="row-between">
              <h2>All Grievances</h2>
              <button className="ghost" onClick={load}>
                Refresh
              </button>
            </div>
            <div className="grid">
              {studentAllGrievances.map((g) => (
                <GrievanceCard
                  key={g._id}
                  grievance={g}
                  role={user.role}
                  currentUserId={user.id}
                  currentUserDepartmentId={user.department?._id}
                  onChanged={load}
                />
              ))}
              {studentAllGrievances.length === 0 && <p className="panel">No grievances found.</p>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
