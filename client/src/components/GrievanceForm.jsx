import { useState } from "react";
import api from "../api";

const GrievanceForm = ({ departments, onCreated }) => {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [image, setImage] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
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
      formData.append("location", location);
      formData.append("departmentId", departmentId);
      formData.append("image", image);
      formData.append("isAnonymous", String(isAnonymous));

      const { data } = await api.post("/grievances", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setDescription("");
      setLocation("");
      setDepartmentId("");
      setImage(null);
      setIsAnonymous(false);
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
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location where issue occurred (e.g., CS6 class)"
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
      <label>
        <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} /> Submit
        anonymously
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
};

export default GrievanceForm;
