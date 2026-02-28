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
  const [globalAllGrievances, setGlobalAllGrievances] = useState([]);
  const [staffDeptGrievances, setStaffDeptGrievances] = useState([]);
  const [staffAllGrievances, setStaffAllGrievances] = useState([]);
  const [staffTab, setStaffTab] = useState("department");
  const [studentMyGrievances, setStudentMyGrievances] = useState([]);
  const [studentAllGrievances, setStudentAllGrievances] = useState([]);
  const [studentTab, setStudentTab] = useState("all");
  const [adminTab, setAdminTab] = useState("grievances");
  const [statusFilter, setStatusFilter] = useState("");

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
      setGlobalAllGrievances(allRes.data);
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
      setGlobalAllGrievances(allRes.data);
      return;
    }

    const [depRes, grievanceRes] = await Promise.all([depReq, api.get("/grievances")]);
    setDepartments(depRes.data);
    setGrievances(grievanceRes.data);
    setGlobalAllGrievances(grievanceRes.data);
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
    const onUpdate = () => {
      load();
    };

    socket.on("grievance:updated", onUpdate);
    return () => {
      socket.off("grievance:updated", onUpdate);
      socket.disconnect();
    };
  }, [socket, user.role]);

  const dashboardStats = useMemo(() => {
    const counts = {
      total: globalAllGrievances.length,
      submitted: 0,
      committee_review: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
      dismissed: 0
    };

    globalAllGrievances.forEach((g) => {
      if (counts[g.status] !== undefined) counts[g.status] += 1;
    });

    return counts;
  }, [globalAllGrievances]);

  const applyStatusFilter = (items) => {
    if (!statusFilter) return items;
    return items.filter((g) => g.status === statusFilter);
  };

  return (
    <div className="page">
      <Navbar />

      <main className="content">
        <section className="list">
          <div className="row-between">
            <h2>All Grievances Dashboard</h2>
            <button className="ghost" onClick={load}>
              Refresh
            </button>
          </div>

          <div className="stats-grid">
            <div className={`panel stat-card ${statusFilter === "" ? "active-stat" : ""}`} onClick={() => setStatusFilter("")}>
              <small>Total</small>
              <strong>{dashboardStats.total}</strong>
            </div>
            <div
              className={`panel stat-card ${statusFilter === "submitted" ? "active-stat" : ""}`}
              onClick={() => setStatusFilter("submitted")}
            >
              <small>Submitted</small>
              <strong>{dashboardStats.submitted}</strong>
            </div>
            <div
              className={`panel stat-card ${statusFilter === "committee_review" ? "active-stat" : ""}`}
              onClick={() => setStatusFilter("committee_review")}
            >
              <small>Review</small>
              <strong>{dashboardStats.committee_review}</strong>
            </div>
            <div
              className={`panel stat-card ${statusFilter === "in_progress" ? "active-stat" : ""}`}
              onClick={() => setStatusFilter("in_progress")}
            >
              <small>In Progress</small>
              <strong>{dashboardStats.in_progress}</strong>
            </div>
            <div
              className={`panel stat-card ${statusFilter === "resolved" ? "active-stat" : ""}`}
              onClick={() => setStatusFilter("resolved")}
            >
              <small>Resolved</small>
              <strong>{dashboardStats.resolved}</strong>
            </div>
            <div
              className={`panel stat-card ${statusFilter === "rejected" ? "active-stat" : ""}`}
              onClick={() => setStatusFilter("rejected")}
            >
              <small>Rejected</small>
              <strong>{dashboardStats.rejected}</strong>
            </div>
            <div
              className={`panel stat-card ${statusFilter === "dismissed" ? "active-stat" : ""}`}
              onClick={() => setStatusFilter("dismissed")}
            >
              <small>Dismissed</small>
              <strong>{dashboardStats.dismissed}</strong>
            </div>
          </div>

          {statusFilter && (
            <p className="meta">
              Active filter: <strong>{statusFilter}</strong>{" "}
              <button className="ghost" onClick={() => setStatusFilter("")}>
                Clear
              </button>
            </p>
          )}
        </section>

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
              {applyStatusFilter(grievances).map((g) => (
                <GrievanceCard
                  key={g._id}
                  grievance={g}
                  role={user.role}
                  currentUserId={user.id}
                  currentUserDepartmentId={user.department?._id}
                  onChanged={load}
                />
              ))}
              {applyStatusFilter(grievances).length === 0 && <p className="panel">No grievances found for this filter.</p>}
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
              {applyStatusFilter(staffDeptGrievances).map((g) => (
                <GrievanceCard
                  key={g._id}
                  grievance={g}
                  role={user.role}
                  currentUserId={user.id}
                  currentUserDepartmentId={user.department?._id}
                  onChanged={load}
                />
              ))}
              {applyStatusFilter(staffDeptGrievances).length === 0 && <p className="panel">No grievances found for this filter.</p>}
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
              {applyStatusFilter(staffAllGrievances).map((g) => (
                <GrievanceCard
                  key={g._id}
                  grievance={g}
                  role={user.role}
                  currentUserId={user.id}
                  currentUserDepartmentId={user.department?._id}
                  onChanged={load}
                />
              ))}
              {applyStatusFilter(staffAllGrievances).length === 0 && <p className="panel">No grievances found for this filter.</p>}
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
              {applyStatusFilter(studentMyGrievances).map((g) => (
                <GrievanceCard
                  key={g._id}
                  grievance={g}
                  role={user.role}
                  currentUserId={user.id}
                  currentUserDepartmentId={user.department?._id}
                  onChanged={load}
                />
              ))}
              {applyStatusFilter(studentMyGrievances).length === 0 && <p className="panel">No grievances found for this filter.</p>}
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
              {applyStatusFilter(studentAllGrievances).map((g) => (
                <GrievanceCard
                  key={g._id}
                  grievance={g}
                  role={user.role}
                  currentUserId={user.id}
                  currentUserDepartmentId={user.department?._id}
                  onChanged={load}
                />
              ))}
              {applyStatusFilter(studentAllGrievances).length === 0 && <p className="panel">No grievances found for this filter.</p>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
