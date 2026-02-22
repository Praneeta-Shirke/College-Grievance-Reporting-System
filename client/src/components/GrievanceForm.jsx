import { useState } from "react";
import api from "../api";

const GrievanceForm = ({ departments, onCreated }) => {
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!image) {
      setError("Please upload an image");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("description", description);
      formData.append("departmentId", departmentId);
      formData.append("image", image);

      const { data } = await api.post("/grievances", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setDescription("");
      setDepartmentId("");
      setImage(null);
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit grievance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="panel form" onSubmit={submit}>
      <h3>Submit Grievance</h3>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe the issue"
        rows={4}
        required
      />
      <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
        <option value="">Select Department</option>
        {departments.map((dep) => (
          <option key={dep._id} value={dep._id}>
            {dep.name}
          </option>
        ))}
      </select>
      <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} required />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
};

export default GrievanceForm;
