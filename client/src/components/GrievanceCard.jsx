import { useMemo, useState } from "react";
import api from "../api";

const pretty = {
  submitted: "Submitted",
  committee_review: "Committee Review",
  approved: "Approved",
  rejected: "Rejected",
  in_progress: "In Progress",
  resolved: "Resolved",
  dismissal_requested: "Dismissal Requested",
  dismissed: "Dismissed"
};

const GrievanceCard = ({ grievance, role, onChanged }) => {
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [dismissReason, setDismissReason] = useState("");
  const [busy, setBusy] = useState(false);

  const imageSrc = useMemo(() => {
    if (!grievance.imageUrl) return "";
    const base = (import.meta.env.VITE_SOCKET_URL || "http://localhost:5000").replace(/\/$/, "");
    return `${base}${grievance.imageUrl}`;
  }, [grievance.imageUrl]);

  const notifyAdmin = async () => {
    setBusy(true);
    try {
      await api.patch(`/grievances/${grievance._id}/notify-admin`);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const approve = async (decision) => {
    setBusy(true);
    try {
      await api.patch(`/grievances/${grievance._id}/admin-approval`, { decision, remarks });
      setRemarks("");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const pushUpdate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/grievances/${grievance._id}/updates`, { message, nextStatus });
      setMessage("");
      setNextStatus("");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const requestDismissal = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/grievances/${grievance._id}/request-dismissal`, { reason: dismissReason });
      setDismissReason("");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const reviewDismissal = async (decision) => {
    setBusy(true);
    try {
      await api.patch(`/grievances/${grievance._id}/dismissal-review`, { decision, remarks });
      setRemarks("");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="panel grievance-card">
      <div className="row-between">
        <h4>{grievance.department?.name || "Department"}</h4>
        <span className={`badge ${grievance.status}`}>{pretty[grievance.status] || grievance.status}</span>
      </div>

      <p>{grievance.description}</p>
      {imageSrc && <img className="preview" src={imageSrc} alt="Grievance" />}

      <p className="meta">Raised by: {grievance.createdBy?.name}</p>
      <p className="meta">Assigned staff: {grievance.assignedStaff?.name}</p>

      {role === "staff" && grievance.status === "submitted" && (
        <button onClick={notifyAdmin} disabled={busy}>
          Forward to Committee
        </button>
      )}

      {role === "admin" && grievance.status === "committee_review" && (
        <div className="stack">
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Approval remarks"
          />
          <div className="actions">
            <button onClick={() => approve("approved")} disabled={busy}>
              Approve
            </button>
            <button className="ghost" onClick={() => approve("rejected")} disabled={busy}>
              Reject
            </button>
          </div>
        </div>
      )}

      {role === "admin" &&
        grievance.status === "dismissal_requested" &&
        grievance.dismissalRequest?.decision === "pending" && (
          <div className="stack">
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Dismissal review remarks"
            />
            <div className="actions">
              <button onClick={() => reviewDismissal("approved")} disabled={busy}>
                Approve Dismissal
              </button>
              <button className="ghost" onClick={() => reviewDismissal("rejected")} disabled={busy}>
                Reject Request
              </button>
            </div>
          </div>
        )}

      {role === "staff" && ["approved", "in_progress"].includes(grievance.status) && (
        <form onSubmit={pushUpdate} className="stack">
          <textarea
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Live status update for student"
            required
          />
          <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
            <option value="">Keep current status</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <button type="submit" disabled={busy}>
            Post Update
          </button>
        </form>
      )}

      {role === "staff" && ["submitted", "approved", "in_progress"].includes(grievance.status) && (
        <form onSubmit={requestDismissal} className="stack">
          <textarea
            rows={2}
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            placeholder="Reason to request dismissal"
            required
          />
          <button type="submit" className="ghost" disabled={busy}>
            Request Dismissal
          </button>
        </form>
      )}

      {grievance.dismissalRequest?.decision && (
        <p className="meta">
          Dismissal Request: {grievance.dismissalRequest.decision}
          {grievance.dismissalRequest.reason ? ` | Reason: ${grievance.dismissalRequest.reason}` : ""}
        </p>
      )}

      <div className="timeline">
        <strong>Updates</strong>
        {(grievance.updates || []).map((u) => (
          <div key={u._id} className="timeline-item">
            <p>{u.message}</p>
            <small>
              {u.updatedBy?.name || "System"} | {pretty[u.statusSnapshot] || u.statusSnapshot}
            </small>
          </div>
        ))}
      </div>
    </article>
  );
};

export default GrievanceCard;
