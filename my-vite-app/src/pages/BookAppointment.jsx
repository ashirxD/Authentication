import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import './BookAppointment.css';

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [appointmentData, setAppointmentData] = useState({
    doctorId: doctorId || "",
    date: "",
    time: "",
    reason: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [requestId, setRequestId] = useState(null);

  // Log doctorId and URL for debugging
  console.log("[BookAppointment] doctorId from useParams:", doctorId);
  console.log("[BookAppointment] Current URL:", window.location.pathname);

  // Validate doctorId format
  const isValidDoctorId = (id) => {
    return id && typeof id === "string" && id.trim() !== "" && /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Fetch doctor details
  const fetchDoctor = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchDoctor] No token found, redirecting to signin");
        setError("Please sign in to book an appointment.");
        setTimeout(() => navigate("/auth/signin"), 2000);
        return;
      }

      if (!isValidDoctorId(doctorId)) {
        console.error("[fetchDoctor] Invalid doctorId format:", doctorId);
        setError("Invalid doctor ID. Please select a valid doctor.");
        setTimeout(() => navigate("/patient-dashboard"), 2000);
        return;
      }

      console.log("[fetchDoctor] Fetching doctor with ID:", doctorId);
      const response = await fetch(`http://localhost:5000/api/patient/doctors/${doctorId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[fetchDoctor] Response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error("[fetchDoctor] Failed:", { status: response.status, message: data.message });
        if (response.status === 404) {
          setError("Invalid doctor ID. Doctor not found.");
        } else if (response.status === 401) {
          console.log("[fetchDoctor] Unauthorized, clearing token");
          localStorage.removeItem("token");
          setError("Session expired. Please sign in again.");
          setTimeout(() => navigate("/auth/signin"), 2000);
        } else {
          setError(data.message || "Failed to fetch doctor details");
        }
        setTimeout(() => navigate("/patient-dashboard"), 2000);
        return;
      }

      setDoctor(data);
      setAppointmentData((prev) => ({ ...prev, doctorId: data._id }));
    } catch (err) {
      console.error("[fetchDoctor] Error:", err);
      setError("Failed to connect to server. Please try again.");
      setTimeout(() => navigate("/patient-dashboard"), 2000);
    }
  };

  // Fetch appointment request status
  const fetchRequestStatus = async (reqId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchRequestStatus] No token found, redirecting to signin");
        setError("Please sign in to view request status.");
        setTimeout(() => navigate("/auth/signin"), 2000);
        return;
      }

      console.log("[fetchRequestStatus] Fetching status for requestId:", reqId);
      const response = await fetch("http://localhost:5000/api/patient/appointments", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[fetchRequestStatus] Response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error("[fetchRequestStatus] Failed:", data.message);
        setError(data.message || "Failed to fetch request status");
        return;
      }

      const request = data.find((req) => req._id === reqId);
      if (request) {
        console.log("[fetchRequestStatus] Found request:", request);
        setRequestStatus({
          status: request.status,
          date: request.date,
          time: request.time,
          doctorName: request.doctor?.name || "Unknown Doctor",
        });
      } else {
        console.warn("[fetchRequestStatus] Request not found:", reqId);
        setError("Appointment request not found.");
      }
    } catch (err) {
      console.error("[fetchRequestStatus] Error:", err);
      setError("Failed to connect to server. Please try again.");
    }
  };

  useEffect(() => {
    if (doctorId) {
      console.log("[useEffect] Processing doctorId:", doctorId);
      fetchDoctor();
    } else {
      console.log("[useEffect] No doctorId, redirecting to patient-dashboard");
      setError("No doctor selected. Please select a doctor.");
      setTimeout(() => navigate("/patient-dashboard"), 2000);
    }
  }, [doctorId, navigate]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log("[handleInputChange] Input:", { name, value });
    setAppointmentData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle appointment request submission
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    setRequestStatus(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[handleBookAppointment] No token found, redirecting to signin");
        setError("Please sign in to book an appointment.");
        setTimeout(() => navigate("/auth/signin"), 2000);
        return;
      }

      const { doctorId, date, time, reason } = appointmentData;
      console.log("[handleBookAppointment] Submitting:", { doctorId, date, time, reason });
      if (!doctorId || !date || !time || !reason) {
        console.error("[handleBookAppointment] Validation failed: All fields required");
        setError("Please fill in all fields.");
        setIsLoading(false);
        return;
      }

      if (!isValidDoctorId(doctorId)) {
        console.error("[handleBookAppointment] Invalid doctorId format:", doctorId);
        setError("Invalid doctor ID. Please select a valid doctor.");
        setIsLoading(false);
        return;
      }

      const response = await fetch("http://localhost:5000/api/patient/appointment/request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ doctorId, date, time, reason }),
      });

      const data = await response.json();
      console.log("[handleBookAppointment] Response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error("[handleBookAppointment] Failed:", data.message);
        setError(data.message || "Failed to send appointment request");
        setIsLoading(false);
        if (response.status === 401) {
          console.log("[handleBookAppointment] Unauthorized, clearing token");
          localStorage.removeItem("token");
          setTimeout(() => navigate("/auth/signin"), 2000);
        }
        return;
      }

      setSuccess("Appointment request sent successfully!");
      setRequestId(data.requestId);
      setAppointmentData({ doctorId: doctorId, date: "", time: "", reason: "" });
      setIsLoading(false);
      // Fetch status immediately after submission
      if (data.requestId) {
        fetchRequestStatus(data.requestId);
      }
    } catch (err) {
      console.error("[handleBookAppointment] Error:", err);
      setError("Failed to connect to server. Please try again.");
      setIsLoading(false);
    }
  };

  // Refresh status every 10 seconds if pending
  useEffect(() => {
    let interval;
    if (requestId && requestStatus?.status === "pending") {
      interval = setInterval(() => {
        console.log("[useEffect] Polling status for requestId:", requestId);
        fetchRequestStatus(requestId);
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [requestId, requestStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Book Appointment</h2>
        {success && (
          <p className="text-green-600 bg-green-100 border border-green-400 rounded p-3 mb-4 animate-fade-in">
            {success}
          </p>
        )}
        {error && (
          <p className="text-red-600 bg-red-100 border border-red-400 rounded p-3 mb-4 animate-fade-in">
            {error}
          </p>
        )}
        {doctor && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800">{doctor.name}</h3>
            <p className="text-gray-600">
              Specialization: {doctor.specialization || "Not specified"}
            </p>
            {doctor.availability && doctor.availability.days?.length > 0 && (
              <p className="text-gray-600">
                Availability: {doctor.availability.days.join(", ")},{" "}
                {doctor.availability.startTime} - {doctor.availability.endTime}
              </p>
            )}
          </div>
        )}
        <form onSubmit={handleBookAppointment}>
          <div className="mb-4">
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={appointmentData.date}
              onChange={handleInputChange}
              min={new Date().toISOString().split("T")[0]}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="time"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Time *
            </label>
            <input
              type="time"
              id="time"
              name="time"
              value={appointmentData.time}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Reason for Appointment *
            </label>
            <textarea
              id="reason"
              name="reason"
              value={appointmentData.reason}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
              required
            />
          </div>
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 p-3 rounded-lg text-white font-semibold transition-all duration-200 ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
              }`}
            >
              {isLoading ? "Sending..." : "Send Appointment Request"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/patient-dashboard")}
              className="flex-1 p-3 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
        {requestStatus && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Appointment Request Status
            </h3>
            <p className="text-gray-600">
              <span className="font-medium">Status:</span>{" "}
              <span
                className={`capitalize ${
                  requestStatus.status === "accepted"
                    ? "text-green-600"
                    : requestStatus.status === "rejected"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {requestStatus.status}
              </span>
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Doctor:</span> {requestStatus.doctorName}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Date:</span>{" "}
              {new Date(requestStatus.date).toISOString().split("T")[0]}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Time:</span> {requestStatus.time}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}