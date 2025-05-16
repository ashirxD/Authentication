import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout, setAvailability } from "../redux/slices/authSlice";
import {
  CalendarIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { useAvailability } from "../context/AvailabilityContext";

export default function DoctorDashboard() {
  const { availability, dispatch: contextDispatch } = useAvailability();
  const [userData, setUserData] = useState({
    name: "",
    role: "",
    specialization: "",
    profilePicture: null,
    twoFAEnabled: false,
  });
  const [editData, setEditData] = useState({
    name: "",
    specialization: "",
    profilePicture: null,
    twoFAEnabled: false,
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [hasProfilePicture, setHasProfilePicture] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("appointments");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [appointmentRequests, setAppointmentRequests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const reduxUser = useSelector((state) => state.auth.user);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const normalizeTime = (time) => {
    if (!time || typeof time !== "string" || time.trim() === "") {
      console.warn("[normalizeTime] Invalid time, returning empty string:", time);
      return "";
    }
    try {
      const [hours, minutes] = time.split(":").slice(0, 2);
      const normalized = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
      console.log("[normalizeTime] Normalized:", time, "->", normalized);
      return normalized;
    } catch (err) {
      console.error("[normalizeTime] Error:", time, err);
      return time;
    }
  };

  const fetchUserData = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchUserData] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const response = await fetch("http://localhost:5000/api/doctor/user", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[fetchUserData] Response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error("[fetchUserData] Failed:", data.message);
        setError(data.message || "Failed to fetch user data");
        localStorage.removeItem("token");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      if (data.role !== "doctor") {
        console.error("[fetchUserData] Access denied: Not a doctor");
        setError("Access denied: Not a doctor");
        localStorage.removeItem("token");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const profilePicture = data.profilePicture || null;
      const userInfo = {
        name: data.name || "",
        role: data.role || "",
        specialization: data.specialization || "",
        profilePicture,
        twoFAEnabled: !!data.twoFAEnabled,
      };

      setUserData(userInfo);
      setEditData({
        name: data.name || "",
        specialization: data.specialization || "",
        profilePicture: null,
        twoFAEnabled: !!data.twoFAEnabled,
      });
      setHasProfilePicture(!!profilePicture);
      setPreviewUrl("");
      console.log("[fetchUserData] Set userData:", userInfo);
    } catch (err) {
      console.error("[fetchUserData] Error:", err);
      setError("Failed to connect to server. Please check your network or try again later.");
      localStorage.removeItem("token");
      dispatch(logout());
      navigate("/auth/signin", { replace: true });
    }
  };

  const fetchAppointmentRequests = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchAppointmentRequests] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const response = await fetch("http://localhost:5000/api/doctor/appointment/requests", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[fetchAppointmentRequests] Fetched:", data);

      if (!response.ok) {
        console.error("[fetchAppointmentRequests] Failed:", data.message);
        setError(data.message || "Failed to fetch appointment requests");
        return;
      }

      setAppointmentRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[fetchAppointmentRequests] Error:", err);
      setError("Failed to fetch appointment requests. Please try again.");
    }
  };

  const fetchAppointments = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchAppointments] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const response = await fetch("http://localhost:5000/api/doctor/appointments", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[fetchAppointments] Fetched:", data);

      if (!response.ok) {
        console.error("[fetchAppointments] Failed:", data.message);
        setError(data.message || "Failed to fetch appointments");
        return;
      }

      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[fetchAppointments] Error:", err);
      setError("Failed to fetch appointments. Please try again.");
    }
  };

  useEffect(() => {
    fetchUserData();
    if (activeSection === "appointment-requests") {
      fetchAppointmentRequests();
    }
    if (activeSection === "patients" || activeSection === "appointments") {
      fetchAppointments();
    }
  }, [navigate, activeSection]);

  const handleLogout = () => {
    console.log("[handleLogout] Logging out");
    localStorage.removeItem("token");
    dispatch(logout());
    navigate("/auth/signin", { replace: true });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log("[handleInputChange] Input:", { name, value, type, checked });
    if (name === "days") {
      const newDays = checked
        ? [...availability.days, value]
        : availability.days.filter((day) => day !== value);
      contextDispatch(setAvailability({ ...availability, days: newDays }));
    } else if (name === "startTime" || name === "endTime") {
      contextDispatch(setAvailability({ ...availability, [name]: value }));
    } else {
      setEditData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setEditData((prev) => ({ ...prev, profilePicture: file }));
      setPreviewUrl(url);
      setHasProfilePicture(true);
      console.log("[handleFileChange] Selected file:", file.name);
    } else {
      setEditData((prev) => ({ ...prev, profilePicture: null }));
      setPreviewUrl("");
      setHasProfilePicture(false);
      console.log("[handleFileChange] No file selected");
    }
  };

  const handleRemovePicture = async () => {
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[handleRemovePicture] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const response = await fetch("http://localhost:5000/api/doctor/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profilePicture: null }),
      });

      const data = await response.json();
      console.log("[handleRemovePicture] Response:", { status: response.status, data });

      if (!response.ok) {
        console.error("[handleRemovePicture] Failed:", data.message);
        setError(data.message || "Failed to remove profile picture");
        return;
      }

      setUserData((prev) => ({ ...prev, profilePicture: null }));
      setEditData((prev) => ({ ...prev, profilePicture: null }));
      setPreviewUrl("");
      setHasProfilePicture(false);
      setSuccess("Profile picture removed successfully");
      setLastUpdate({ profilePicture: null, timestamp: Date.now() });
      dispatch({ type: "auth/updateProfilePicture", payload: null });
    } catch (err) {
      console.error("[handleRemovePicture] Error:", err);
      setError(err.message || "Failed to connect to server");
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (!availability.startTime || !availability.endTime) {
      setError("Please provide both start and end times.");
      setIsLoading(false);
      console.log("[handleProfileUpdate] Validation failed, availability:", availability);
      return;
    }
    if (!availability.days || availability.days.length === 0) {
      setError("Please select at least one shift day.");
      setIsLoading(false);
      console.log("[handleProfileUpdate] Validation failed, availability:", availability);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[handleProfileUpdate] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const formData = new FormData();
      formData.append("name", editData.name);
      formData.append("specialization", editData.specialization);
      formData.append("twoFAEnabled", editData.twoFAEnabled.toString());
      formData.append("startTime", availability.startTime);
      formData.append("endTime", availability.endTime);
      formData.append("days", JSON.stringify(availability.days));
      if (editData.profilePicture) {
        formData.append("profilePicture", editData.profilePicture);
        console.log("[handleProfileUpdate] FormData includes profilePicture:", editData.profilePicture.name);
      }

      const response = await fetch("http://localhost:5000/api/doctor/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      console.log("[handleProfileUpdate] Response:", data);

      if (!response.ok) {
        console.error("[handleProfileUpdate] Failed:", data.message);
        setError(data.message || "Failed to update profile");
        setIsLoading(false);
        return;
      }

      const updatedUserData = {
        ...userData,
        name: data.user.name || editData.name,
        specialization: data.user.specialization || editData.specialization,
        profilePicture: data.user.profilePicture || null,
        twoFAEnabled: data.user.twoFAEnabled || editData.twoFAEnabled,
      };
      setUserData(updatedUserData);
      setEditData({
        name: data.user.name || editData.name,
        specialization: data.user.specialization || editData.specialization,
        profilePicture: null,
        twoFAEnabled: data.user.twoFAEnabled || editData.twoFAEnabled,
      });
      setHasProfilePicture(!!data.user.profilePicture);
      setPreviewUrl("");
      setLastUpdate({ profilePicture: data.user.profilePicture || null, timestamp: Date.now() });
      dispatch({ type: "auth/updateProfilePicture", payload: data.user.profilePicture || null });

      contextDispatch(setAvailability({
        startTime: data.user.availability?.startTime || availability.startTime,
        endTime: data.user.availability?.endTime || availability.endTime,
        days: data.user.availability?.days || availability.days,
      }));

      setSuccess("Profile updated successfully!");
    } catch (err) {
      console.error("[handleProfileUpdate] Error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[handleAcceptRequest] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const response = await fetch("http://localhost:5000/api/doctor/appointment/accept", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const data = await response.json();
      console.log("[handleAcceptRequest] Response:", data);

      if (!response.ok) {
        console.error("[handleAcceptRequest] Failed:", data.message);
        setError(data.message || "Failed to accept appointment request");
        return;
      }

      setAppointmentRequests((prev) => prev.filter((req) => req._id !== requestId));
      setSuccess("Appointment request accepted successfully!");
      fetchAppointments(); // Refresh appointments after accepting
    } catch (err) {
      console.error("[handleAcceptRequest] Error:", err);
      setError("Failed to accept the request. Please try again.");
    }
  };

  const handleRejectRequest = async (requestId) => {
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[handleRejectRequest] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const response = await fetch("http://localhost:5000/api/doctor/appointment/reject", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const data = await response.json();
      console.log("[handleRejectRequest] Response:", data);

      if (!response.ok) {
        console.error("[handleRejectRequest] Failed:", data.message);
        setError(data.message || "Failed to reject appointment request");
        return;
      }

      setAppointmentRequests((prev) => prev.filter((req) => req._id !== requestId));
      setSuccess("Appointment request rejected successfully!");
    } catch (err) {
      console.error("[handleRejectRequest] Error:", err);
      setError("Failed to reject the request. Please try again.");
    }
  };

  // Deduplicate patients by patient._id
  const uniquePatients = Array.from(
    new Map(
      appointments.map((appt) => [
        appt.patient?._id?.toString(),
        {
          _id: appt.patient?._id,
          name: appt.patient?.name || "Unknown Patient",
          phoneNumber: appt.patient?.phoneNumber || "N/A",
          email: appt.patient?.email || "N/A",
          profilePicture: appt.patient?.profilePicture || null, // Include profilePicture
        },
      ])
    ).values()
  ).filter((patient) => patient._id); // Filter out invalid patients

  const renderContent = () => {
    switch (activeSection) {
      case "appointments":
        return (
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Upcoming Appointments
            </h3>
            {error && (
              <p className="text-red-600 bg-red-100 border border-red-400 rounded p-3 mb-4 animate-fade-in">
                {error}
              </p>
            )}
            {appointments.length === 0 ? (
              <p className="text-gray-600">No upcoming appointments.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow">
                  <thead>
                    <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                      <th className="py-4 px-6 text-left">Patient</th>
                      <th className="py-4 px-6 text-left">Date</th>
                      <th className="py-4 px-6 text-left">Time</th>
                      <th className="py-4 px-6 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm font-light">
                    {appointments.map((appointment) => (
                      <tr
                        key={appointment._id}
                        className="border-b border-gray-200 even:bg-gray-50 hover:bg-gray-100"
                      >
                        <td className="py-4 px-6 font-semibold">
                          {appointment.patient?.name || "Unknown Patient"}
                        </td>
                        <td className="py-4 px-6">
                          {appointment.date
                            ? new Date(appointment.date).toISOString().split("T")[0]
                            : "N/A"}
                        </td>
                        <td className="py-4 px-6 text-teal-600">
                          {appointment.time || "N/A"}
                        </td>
                        <td className="py-4 px-6">{appointment.reason || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case "patients":
        return (
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              My Patients
            </h3>
            {error && (
              <p className="text-red-600 bg-red-100 border border-red-400 rounded p-3 mb-4 animate-fade-in">
                {error}
              </p>
            )}
            {uniquePatients.length === 0 ? (
              <p className="text-gray-600">No patients with upcoming appointments.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uniquePatients.map((patient) => (
                  <div
                    key={patient._id}
                    className="flex border border-gray-300 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
                  >
                    <div className="w-24 h-24 mr-5">
                      {patient.profilePicture ? (
                        <img
                          src={`http://localhost:5000${patient.profilePicture}?t=${Date.now()}`}
                          alt={`${patient.name}'s profile`}
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            e.target.style.display = 'none'; // Hide image if it fails to load
                            console.error("[patients] Image load error:", patient.profilePicture, e);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 rounded-full"></div> // Placeholder
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-800">{patient.name}</h4>
                      <p className="text-sm text-gray-600">Email: {patient.email}</p>
                      <p className="text-sm text-gray-600">Phone: {patient.phoneNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "appointment-requests":
        return (
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Appointment Requests
            </h3>
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
            {appointmentRequests.length === 0 ? (
              <p className="text-gray-600">No pending appointment requests.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                      <th className="py-3 px-6 text-left">Patient</th>
                      <th className="py-3 px-6 text-left">Date</th>
                      <th className="py-3 px-6 text-left">Time</th>
                      <th className="py-3 px-6 text-left">Reason</th>
                      <th className="py-3 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm font-light">
                    {appointmentRequests.map((request) => (
                      <tr
                        key={request._id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-3 px-6">
                          {request.patient?.name || "Unknown Patient"}
                        </td>
                        <td className="py-3 px-6">
                          {request.date
                            ? new Date(request.date).toISOString().split("T")[0]
                            : "N/A"}
                        </td>
                        <td className="py-3 px-6">{request.time || "N/A"}</td>
                        <td className="py-3 px-6">{request.reason || "N/A"}</td>
                        <td className="py-3 px-6 text-center space-x-2">
                          <button
                            onClick={() => handleAcceptRequest(request._id)}
                            className="text-green-600 hover:text-green-800 px-3 py-1 rounded bg-green-100 hover:bg-green-200 transition"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request._id)}
                            className="text-red-600 hover:text-red-800 px-3 py-1 rounded bg-red-100 hover:bg-red-200 transition"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case "edit-profile":
        return (
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-6">
              Edit Profile
            </h3>
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl">
              {success && (
                <p className="text-green-600 bg-green-50 border border-green-200 rounded-lg p-4 mb-6 font-medium animate-fade-in">
                  {success}
                </p>
              )}
              {error && (
                <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 mb-6 font-medium animate-fade-in">
                  {error}
                </p>
              )}
              <form onSubmit={handleProfileUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={editData.name}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="specialization"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Specialization
                      </label>
                      <input
                        type="text"
                        id="specialization"
                        name="specialization"
                        value={editData.specialization}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="startTime"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Availability Start Time
                      </label>
                      <input
                        type="time"
                        id="startTime"
                        name="startTime"
                        value={availability.startTime}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="endTime"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Availability End Time
                      </label>
                      <input
                        type="time"
                        id="endTime"
                        name="endTime"
                        value={availability.endTime}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shift Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map((day) => (
                      <label
                        key={day}
                        className={`flex items-center justify-center px-4 py-2 rounded-full border cursor-pointer transition-all duration-200 ${
                          availability.days.includes(day)
                            ? "bg-blue-500 text-white border-blue-500 shadow-md"
                            : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="days"
                          value={day}
                          checked={availability.days.includes(day)}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <label
                    htmlFor="profilePicture"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Profile Picture
                  </label>
                  {hasProfilePicture && (previewUrl || userData.profilePicture) && (
                    <div className="relative mb-4 w-24 h-24">
                      <img
                        src={
                          previewUrl ||
                          `http://localhost:5000${userData.profilePicture}?t=${Date.now()}`
                        }
                        alt="Profile Preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                        onError={(e) =>
                          console.error("[renderContent] Image load error:", userData.profilePicture, e)
                        }
                      />
                      <button
                        type="button"
                        onClick={handleRemovePicture}
                        className="absolute top-[-8px] right-[-8px] bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-transform transform hover:scale-110"
                        title="Remove Picture"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {!hasProfilePicture && (
                    <input
                      type="file"
                      id="profilePicture"
                      name="profilePicture"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full p-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-shadow hover:shadow-sm"
                    />
                  )}
                </div>
                <div className="mb-6 flex items-center space-x-4">
                  <label
                    htmlFor="twoFAEnabled"
                    className="text-sm font-medium text-gray-700"
                  >
                    Two-Factor Authentication
                  </label>
                  <div className="relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      id="twoFAEnabled"
                      name="twoFAEnabled"
                      checked={editData.twoFAEnabled}
                      onChange={handleInputChange}
                      className="absolute opacity-0 w-full h-full cursor-pointer"
                    />
                    <div
                      className={`w-full h-full rounded-full transition-colors duration-200 ${
                        editData.twoFAEnabled ? "bg-blue-500" : "bg-gray-300"
                      }`}
                    ></div>
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        editData.twoFAEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    ></div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full p-3 rounded-lg text-white font-semibold transition-all duration-200 ${
                    isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    "Update Profile"
                  )}
                </button>
              </form>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex">
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      <div className="w-64 bg-white shadow-lg p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-8">
            Doctor Dashboard
          </h2>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection("appointments")}
              className={`w-full flex items-center p-3 rounded-lg text-gray-700 hover:bg-blue-100 transition ${
                activeSection === "appointments"
                  ? "bg-blue-100 text-blue-600"
                  : ""
              }`}
            >
              <CalendarIcon className="w-6 h-6 mr-3" />
              Appointments
            </button>
            <button
              onClick={() => setActiveSection("patients")}
              className={`w-full flex items-center p-3 rounded-lg text-gray-700 hover:bg-blue-100 transition ${
                activeSection === "patients" ? "bg-blue-100 text-blue-600" : ""
              }`}
            >
              <UserGroupIcon className="w-6 h-6 mr-3" />
              Patients
            </button>
            <button
              onClick={() => setActiveSection("appointment-requests")}
              className={`w-full flex items-center p-3 rounded-lg text-gray-700 hover:bg-blue-100 transition ${
                activeSection === "appointment-requests"
                  ? "bg-blue-100 text-blue-600"
                  : ""
              }`}
            >
              <ClipboardDocumentListIcon className="w-6 h-6 mr-3" />
              Appointment Requests
            </button>
            <button
              onClick={() => setActiveSection("edit-profile")}
              className={`w-full flex items-center p-3 rounded-lg text-gray-700 hover:bg-blue-100 transition ${
                activeSection === "edit-profile"
                  ? "bg-blue-100 text-blue-600"
                  : ""
              }`}
            >
              <PencilIcon className="w-6 h-6 mr-3" />
              Edit Profile
            </button>
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center p-3 text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6 mr-3" />
          Logout
        </button>
      </div>
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 flex items-center space-x-4">
            {userData.profilePicture && (
              <img
                src={`http://localhost:5000${userData.profilePicture}?t=${Date.now()}`}
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover"
                onError={(e) =>
                  console.error("[header] Image load error:", userData.profilePicture, e)
                }
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Welcome, Dr. {userData.name || "Loading..."}!
              </h1>
              <p className="text-gray-600">
                Manage your practice efficiently from your dashboard.
              </p>
              {userData.specialization && (
                <p className="text-blue-600 mt-1">
                  Specialization: {userData.specialization}
                </p>
              )}
              {availability.startTime &&
                availability.endTime &&
                availability.days?.length > 0 && (
                  <p className="text-blue-600 mt-1">
                    Availability: {availability.days.join(", ")},{" "}
                    {availability.startTime} - {availability.endTime}
                  </p>
                )}
            </div>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}