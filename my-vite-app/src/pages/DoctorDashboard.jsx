import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import {
  CalendarIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function DoctorDashboard() {
  const [userData, setUserData] = useState({
    name: "",
    role: "",
    specialization: "",
    profilePicture: "",
    twoFAEnabled: false,
    availability: { startTime: "", endTime: "", days: [] },
  });
  const [editData, setEditData] = useState({
    name: "",
    specialization: "",
    profilePicture: null,
    twoFAEnabled: false,
    startTime: "",
    endTime: "",
    days: [],
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [hasProfilePicture, setHasProfilePicture] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("appointments");
  const [justUpdated, setJustUpdated] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Available days for selection
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Normalize time to HH:mm format
  const normalizeTime = (time) => {
    if (!time || typeof time !== "string" || time.trim() === "") {
      console.warn("Invalid or empty time, returning empty string:", time);
      return "";
    }
    try {
      const [hours, minutes] = time.split(":").slice(0, 2);
      const normalized = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
      console.log("Normalized time:", time, "->", normalized);
      return normalized;
    } catch (err) {
      console.error("Error normalizing time:", time, err);
      return time;
    }
  };

  // Fetch user data
  const fetchUserData = async () => {
    if (justUpdated) {
      console.log("Skipping fetchUserData due to recent update");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, redirecting to signin");
        navigate("/auth/signin");
        return;
      }

      const response = await fetch("http://localhost:5000/api/doctor/user", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("Raw backend response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error("Fetch user data failed:", data.message);
        setError(data.message || "Failed to fetch user data");
        localStorage.removeItem("token");
        navigate("/auth/signin");
        return;
      }

      if (data.role !== "doctor") {
        console.error("Access denied: Not a doctor");
        setError("Access denied: Not a doctor");
        localStorage.removeItem("token");
        navigate("/auth/signin");
        return;
      }

      const userInfo = {
        name: data.name || "",
        role: data.role || "",
        specialization: data.specialization || "",
        profilePicture: data.profilePicture || "",
        twoFAEnabled: !!data.twoFAEnabled,
        availability: {
          startTime: data.availability?.startTime ? normalizeTime(data.availability.startTime) : "",
          endTime: data.availability?.endTime ? normalizeTime(data.availability.endTime) : "",
          days: data.availability?.days && Array.isArray(data.availability.days) ? data.availability.days : [],
        },
      };

      setUserData(userInfo);
      setEditData({
        name: data.name || "",
        specialization: data.specialization || "",
        profilePicture: null,
        twoFAEnabled: !!data.twoFAEnabled,
        startTime: data.availability?.startTime ? normalizeTime(data.availability.startTime) : "",
        endTime: data.availability?.endTime ? normalizeTime(data.availability.endTime) : "",
        days: data.availability?.days && Array.isArray(data.availability.days) ? data.availability.days : [],
      });
      setHasProfilePicture(!!data.profilePicture);
      setPreviewUrl("");
      console.log("Set userData:", userInfo);
      console.log("Set editData:", {
        name: data.name,
        startTime: data.availability?.startTime ? normalizeTime(data.availability.startTime) : "",
        endTime: data.availability?.endTime ? normalizeTime(data.availability.endTime) : "",
        days: data.availability?.days || [],
      });
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Something went wrong. Please try again.");
      localStorage.removeItem("token");
      navigate("/auth/signin");
    }
  };

  // Initial fetch and refresh on section change
  useEffect(() => {
    fetchUserData();
  }, [navigate, activeSection]);

  // Reset justUpdated after fetchUserData runs
  useEffect(() => {
    if (justUpdated) {
      setTimeout(() => setJustUpdated(false), 1000);
    }
  }, [justUpdated]);

  // Handle logout
  const handleLogout = () => {
    console.log("Logging out");
    localStorage.removeItem("token");
    dispatch(logout());
    navigate("/auth/signin");
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "days") {
      setEditData((prev) => {
        const newDays = checked
          ? [...prev.days, value]
          : prev.days.filter((day) => day !== value);
        const newData = { ...prev, days: newDays };
        console.log("Days changed, new editData:", newData);
        return newData;
      });
    } else {
      setEditData((prev) => {
        const newData = {
          ...prev,
          [name]: type === "checkbox" ? checked : value,
        };
        console.log("Input changed, new editData:", newData);
        return newData;
      });
    }
  };

  // Handle file input change and generate preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setEditData((prev) => ({ ...prev, profilePicture: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setHasProfilePicture(true);
      console.log("Selected file:", file.name);
    } else {
      setPreviewUrl("");
      setHasProfilePicture(false);
    }
  };

  // Handle removing the profile picture
  const handleRemovePicture = () => {
    setEditData((prev) => ({ ...prev, profilePicture: null }));
    setPreviewUrl("");
    setHasProfilePicture(false);
    console.log("Profile picture removed");
  };

  // Clean up preview URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle form submission
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    // Validate time fields and days
    if (!editData.startTime || !editData.endTime) {
      setError("Please provide both start and end times.");
      setIsLoading(false);
      console.log("Validation failed, editData:", editData);
      return;
    }
    if (!editData.days || editData.days.length === 0) {
      setError("Please select at least one shift day.");
      setIsLoading(false);
      console.log("Validation failed, editData:", editData);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", editData.name);
      formData.append("specialization", editData.specialization);
      formData.append("twoFAEnabled", editData.twoFAEnabled.toString());
      formData.append("startTime", editData.startTime);
      formData.append("endTime", editData.endTime);
      formData.append("days", JSON.stringify(editData.days));
      if (editData.profilePicture) {
        formData.append("profilePicture", editData.profilePicture);
        console.log("FormData includes profilePicture:", editData.profilePicture.name);
      }

      console.log("Submitting FormData:");
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value instanceof File ? value.name : value}`);
      }

      const response = await fetch("http://localhost:5000/api/doctor/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      console.log("Profile update response:", data);

      if (!response.ok) {
        console.error("Profile update failed:", data.message);
        setError(data.message || "Failed to update profile");
        setIsLoading(false);
        return;
      }

      // Update editData to preserve form values
      setEditData((prev) => ({
        ...prev,
        name: editData.name,
        specialization: editData.specialization,
        profilePicture: null,
        twoFAEnabled: editData.twoFAEnabled,
        startTime: editData.startTime,
        endTime: editData.endTime,
        days: editData.days,
      }));
      console.log("Preserved editData after submission:", editData);

      // Update userData with backend response
      const updatedUserData = {
        ...userData,
        name: data.user.name || editData.name,
        specialization: data.user.specialization || editData.specialization,
        profilePicture: data.user.profilePicture || userData.profilePicture,
        twoFAEnabled: data.user.twoFAEnabled || editData.twoFAEnabled,
        availability: {
          startTime: data.user.availability?.startTime || editData.startTime,
          endTime: data.user.availability?.endTime || editData.endTime,
          days: data.user.availability?.days || editData.days,
        },
      };
      setUserData(updatedUserData);
      console.log("Updated userData:", updatedUserData);

      setJustUpdated(true);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Mock data for appointments
  const appointments = [
    {
      id: 1,
      patient: "John Doe",
      date: "2025-05-10",
      time: "10:00 AM",
      reason: "Routine Checkup",
    },
    {
      id: 2,
      patient: "Jane Smith",
      date: "2025-05-11",
      time: "2:00 PM",
      reason: "Follow-up",
    },
    {
      id: 3,
      patient: "Alice Johnson",
      date: "2025-05-12",
      time: "9:30 AM",
      reason: "Consultation",
    },
  ];

  // Mock data for patients
  const patients = [
    {
      id: 1,
      name: "John Doe",
      age: 45,
      lastVisit: "2025-04-20",
      condition: "Hypertension",
    },
    {
      id: 2,
      name: "Jane Smith",
      age: 32,
      lastVisit: "2025-05-01",
      condition: "Diabetes",
    },
    {
      id: 3,
      name: "Alice Johnson",
      age: 28,
      lastVisit: "2025-03-15",
      condition: "Asthma",
    },
  ];

  // Render content based on active section
  const renderContent = () => {
    console.log("Rendering edit-profile, current editData:", editData);
    switch (activeSection) {
      case "appointments":
        return (
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Upcoming Appointments
            </h3>
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
                  {appointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-3 px-6">{appointment.patient}</td>
                      <td className="py-3 px-6">{appointment.date}</td>
                      <td className="py-3 px-6">{appointment.time}</td>
                      <td className="py-3 px-6">{appointment.reason}</td>
                      <td className="py-3 px-6 text-center">
                        <button className="text-blue-600 hover:text-blue-800">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "patients":
        return (
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              My Patients
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
                >
                  <h4 className="text-lg font-semibold text-gray-800">
                    {patient.name}
                  </h4>
                  <p className="text-gray-600">Age: {patient.age}</p>
                  <p className="text-gray-600">
                    Last Visit: {patient.lastVisit}
                  </p>
                  <p className="text-gray-600">
                    Condition: {patient.condition}
                  </p>
                  <button className="mt-4 text-blue-600 hover:text-blue-800">
                    View Profile
                  </button>
                </div>
              ))}
            </div>
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
                  {/* Left Column: Name and Specialization */}
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
                  {/* Right Column: Start and End Time */}
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
                        value={editData.startTime}
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
                        value={editData.endTime}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow hover:shadow-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
                {/* Shift Days */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shift Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map((day) => (
                      <label
                        key={day}
                        className={`flex items-center justify-center px-4 py-2 rounded-full border cursor-pointer transition-all duration-200 ${
                          editData.days.includes(day)
                            ? "bg-blue-500 text-white border-blue-500 shadow-md"
                            : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="days"
                          value={day}
                          checked={editData.days.includes(day)}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
                {/* Profile Picture */}
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
                        onError={(e) => console.error("Image load error:", userData.profilePicture, e)}
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
                {/* Two-Factor Authentication */}
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
                {/* Submit Button */}
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
            {userData.profilePicture && userData.profilePicture !== "" && (
              <img
                src={`http://localhost:5000${userData.profilePicture}?t=${Date.now()}`}
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover"
                onError={(e) => console.error("Header image load error:", userData.profilePicture, e)}
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
              {userData.availability?.startTime &&
                userData.availability?.endTime &&
                userData.availability?.days?.length > 0 && (
                  <p className="text-blue-600 mt-1">
                    Availability: {userData.availability.days.join(", ")},{" "}
                    {userData.availability.startTime} - {userData.availability.endTime}
                  </p>
                )}
            </div>
          </div>
          {error && (
            <p className="text-red-600 bg-red-100 border border-red-400 rounded p-3 mb-6">
              {error}
            </p>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}