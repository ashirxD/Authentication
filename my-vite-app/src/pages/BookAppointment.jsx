import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function BookAppointment() {
  const [doctors, setDoctors] = useState([]);
  const [formData, setFormData] = useState({
    doctorId: "",
    date: "",
    time: "",
    reason: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch all doctors
  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, redirecting to signin");
        navigate("/auth/signin");
        return;
      }

      const response = await fetch("http://localhost:5000/api/patient/doctors", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("Fetched doctors:", data);

      if (!response.ok) {
        console.error("Fetch doctors failed:", data.message);
        setError(data.message || "Failed to fetch doctors");
        return;
      }

      setDoctors(data);
      if (data.length > 0) {
        setFormData((prev) => ({ ...prev, doctorId: data[0]._id }));
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [navigate]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      console.log("Updated formData:", newData);
      return newData;
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/patient/appointment/request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("Appointment request response:", data);

      if (!response.ok) {
        console.error("Appointment request failed:", data.message);
        setError(data.message || "Failed to send appointment request");
        setIsLoading(false);
        return;
      }

      setSuccess("Appointment request sent successfully!");
      setFormData({
        doctorId: doctors.length > 0 ? doctors[0]._id : "",
        date: "",
        time: "",
        reason: "",
      });
    } catch (err) {
      console.error("Error sending appointment request:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get selected doctor's availability for time input constraints
  const selectedDoctor = doctors.find((doc) => doc._id === formData.doctorId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-pink-100 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Book an Appointment</h1>
        {success && (
          <p className="text-green-600 bg-green-100 border border-green-400 rounded p-3 mb-4">
            {success}
          </p>
        )}
        {error && (
          <p className="text-red-600 bg-red-100 border border-red-400 rounded p-3 mb-4">
            {error}
          </p>
        )}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Doctors</h2>
          {doctors.length === 0 ? (
            <p className="text-gray-600">No doctors available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doctor) => (
                <div
                  key={doctor._id}
                  className={`p-4 border rounded-lg flex items-center space-x-4 ${
                    formData.doctorId === doctor._id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, doctorId: doctor._id }))}
                >
                  {doctor.profilePicture && (
                    <img
                      src={`http://localhost:5000${doctor.profilePicture}?t=${Date.now()}`}
                      alt={doctor.name}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => console.error("Doctor image load error:", doctor.profilePicture, e)}
                    />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Dr. {doctor.name}</h3>
                    {doctor.specialization && (
                      <p className="text-gray-600">Specialization: {doctor.specialization}</p>
                    )}
                    {doctor.availability?.startTime && doctor.availability?.endTime ? (
                      <p className="text-gray-600">
                        Available: {doctor.availability.startTime} - {doctor.availability.endTime}
                      </p>
                    ) : (
                      <p className="text-gray-600">Availability not set</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Appointment Details</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="doctorId" className="block text-gray-700 font-medium mb-2">
                Select Doctor *
              </label>
              <select
                id="doctorId"
                name="doctorId"
                value={formData.doctorId}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {doctors.map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>
                    Dr. {doctor.name} {doctor.specialization ? `(${doctor.specialization})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="date" className="block text-gray-700 font-medium mb-2">
                Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                min={new Date().toISOString().split("T")[0]} // Restrict to future dates
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="time" className="block text-gray-700 font-medium mb-2">
                Time *
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                min={selectedDoctor?.availability?.startTime || ""}
                max={selectedDoctor?.availability?.endTime || ""}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {selectedDoctor?.availability?.startTime && selectedDoctor?.availability?.endTime && (
                <p className="text-sm text-gray-500 mt-1">
                  Doctor available from {selectedDoctor.availability.startTime} to{" "}
                  {selectedDoctor.availability.endTime}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label htmlFor="reason" className="block text-gray-700 font-medium mb-2">
                Reason for Appointment *
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || doctors.length === 0}
              className={`w-full p-2 rounded text-white transition ${
                isLoading || doctors.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isLoading ? "Sending Request..." : "Send Appointment Request"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}