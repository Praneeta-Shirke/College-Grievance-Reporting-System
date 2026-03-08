import { useState } from "react";
import api from "../api";

const AdminCollegeIdBulkForm = ({
  endpoint = "/auth/admin/college-ids/bulk",
  title = "Bulk Add College IDs",
  helpLine = "One row per line: ROLE,COLLEGE_ID,NOTES(optional)",
  exampleLine = "Examples: student,STU-2027-0001 | staff,STF-CS-010 | admin,ADM-1010",
  placeholder = "student,STU-2027-0001,First year student ID\nstaff,STF-CS-010,CS staff slot\nadmin,ADM-1010,New admin slot",
  submitLabel = "Import College IDs",
  loadingLabel = "Importing...",
  failMessage = "Failed to import college IDs"
}) => {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!rawText.trim()) {
      setError("Please add at least one row.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(endpoint, { rawText });
      setResult(res.data);
      setRawText("");
    } catch (err) {
      setError(err.response?.data?.message || failMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="panel form" onSubmit={submit}>
      <h3>{title}</h3>
      <p className="subtext">{helpLine}</p>
      <p className="subtext">{exampleLine}</p>

      <textarea
        rows={8}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={placeholder}
        required
      />

      {error && <p className="error">{error}</p>}
      {result && (
        <div className="panel">
          <p className="meta">
            Processed: {result.summary.total} | Created: {result.summary.created} | Skipped: {result.summary.skipped} |
            Errors: {result.summary.errors}
          </p>
          <div className="bulk-results">
            {result.results.map((row) => (
              <p key={`${row.row}-${row.collegeId}-${row.status}`} className={`bulk-row bulk-${row.status}`}>
                #{row.row} {row.role} {row.collegeId} - {row.status.toUpperCase()} ({row.message})
              </p>
            ))}
          </div>
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? loadingLabel : submitLabel}
      </button>
    </form>
  );
};

export default AdminCollegeIdBulkForm;
