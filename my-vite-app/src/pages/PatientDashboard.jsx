import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import {
  CalendarIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  XMarkIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import './PatientDashboard.css';

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function PatientDashboard() {
  const [userData, setUserData] = useState({
    name: "",
    role: "",
    profilePicture: "",
    phoneNumber: "",
    twoFAEnabled: false,
  });
  const [editData, setEditData] = useState({
    name: "",
    profilePicture: null,
    phoneNumber: "",
    twoFAEnabled: false,
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [hasProfilePicture, setHasProfilePicture] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [noResultsMessage, setNoResultsMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("appointments");
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [timeFilter, setTimeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchUserData] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const response = await fetch("http://localhost:5000/api/patient/user", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[fetchUserData] Response:", data);

      if (!response.ok) {
        console.error("[fetchUserData] Failed:", data.message);
        setError(data.message || "Failed to fetch user data");
        localStorage.removeItem("token");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      if (data.role !== "patient") {
        console.error("[fetchUserData] Access denied: Not a patient");
        setError("Access denied: Not a patient");
        localStorage.removeItem("token");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const userInfo = {
        name: data.name || "",
        role: data.role || "",
        profilePicture: data.profilePicture || "",
        phoneNumber: data.phoneNumber || "",
        twoFAEnabled: !!data.twoFAEnabled,
      };

      setUserData(userInfo);
      setEditData({
        name: data.name || "",
        profilePicture: null,
        phoneNumber: data.phoneNumber || "",
        twoFAEnabled: !!data.twoFAEnabled,
      });
      setHasProfilePicture(!!data.profilePicture);
      setPreviewUrl("");
    } catch (err) {
      console.error("[fetchUserData] Error:", err);
      setError("Something went wrong. Please try again.");
      localStorage.removeItem("token");
      dispatch(logout());
      navigate("/auth/signin", { replace: true });
    }
  };

  // Fetch doctors data
  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchDoctors] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const response = await fetch("http://localhost:5000/api/patient/doctors", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[fetchDoctors] Raw Response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error("[fetchDoctors] Failed:", data.message);
        setError(data.message || "Failed to fetch doctors");
        return;
      }

      const validDoctors = Array.isArray(data)
        ? data.filter(doc => {
            if (!doc._id || typeof doc._id !== "string" || doc._id.trim() === "") {
              console.warn("[fetchDoctors] Invalid doctor:", doc);
              return false;
            }
            return true;
          })
        : [];
      if (validDoctors.length === 0) {
        console.warn("[fetchDoctors] No valid doctors found");
        setError("No valid doctors available.");
      } else if (validDoctors.length !== data.length) {
        console.warn("[fetchDoctors] Filtered out invalid doctors:", {
          original: data.length,
          valid: validDoctors.length,
        });
      }
      setDoctors(validDoctors);
    } catch (err) {
      console.error("[fetchDoctors] Error:", err);
      setError("Something went wrong while fetching doctors. Please try again.");
    }
  };

  // Fetch all appointment requests with filters
  const fetchAppointments = async (filters) => {
    try {
      setIsAppointmentsLoading(true);
      setError("");
      setNoResultsMessage("");
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchAppointments] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      console.log("[fetchAppointments] Fetching with filters:", filters);

      const queryParams = new URLSearchParams();
      if (filters.timeFilter) queryParams.append("time", filters.timeFilter);
      if (filters.statusFilter) queryParams.append("status", filters.statusFilter);
      if (filters.doctorFilter) queryParams.append("doctorId", filters.doctorFilter);

      const url = `http://localhost:5000/api/patient/appointments?${queryParams.toString()}`;
      console.log("[fetchAppointments] Request URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[fetchAppointments] Raw Response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error("[fetchAppointments] Failed:", {
          status: response.status,
          message: data.message,
        });
        setError(data.message || "Failed to fetch appointment requests");
        setAppointments([]);
        return;
      }

      if (!Array.isArray(data)) {
        console.warn("[fetchAppointments] Response is not an array:", data);
        setError("Invalid response format from server");
        setAppointments([]);
        return;
      }

      console.log("[fetchAppointments] Parsed Data:", {
        count: data.length,
        appointments: data.map(a => ({
          id: a._id,
          status: a.status,
          doctor: a.doctor?.name || "Unknown",
          date: a.date,
        })),
      });

      setAppointments(data);
      if (data.length === 0) {
        setNoResultsMessage("No appointments match the selected filters.");
      }
    } catch (err) {
      console.error("[fetchAppointments] Error:", {
        message: err.message,
        stack: err.stack,
      });
      setError("Something went wrong while fetching appointments. Please try again.");
      setAppointments([]);
    } finally {
      setIsAppointmentsLoading(false);
    }
  };

  // Debounced fetchAppointments
  const debouncedFetchAppointments = useMemo(
    () => debounce((filters) => fetchAppointments(filters), 300),
    []
  );

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setTimeFilter(newFilters.timeFilter);
    setStatusFilter(newFilters.statusFilter);
    setDoctorFilter(newFilters.doctorFilter);
    debouncedFetchAppointments(newFilters);
  }, [debouncedFetchAppointments]);

  // Clear all filters
  const clearFilters = () => {
    const newFilters = { timeFilter: "", statusFilter: "", doctorFilter: "" };
    setTimeFilter("");
    setStatusFilter("");
    setDoctorFilter("");
    debouncedFetchAppointments(newFilters);
    console.log("[clearFilters] All filters cleared");
  };

  // Initial fetch
  useEffect(() => {
    fetchUserData();
    fetchDoctors();
    if (activeSection === "appointments") {
      debouncedFetchAppointments({ timeFilter, statusFilter, doctorFilter });
    }
  }, [activeSection]);

  // Handle logout
  const handleLogout = () => {
    console.log("[handleLogout] Logging out");
    localStorage.removeItem("token");
    dispatch(logout());
    navigate("/auth/signin", { replace: true });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData((prev) => {
      const newData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      console.log("[handleInputChange] Updated editData:", newData);
      return newData;
    });
  };

  // Handle file input change and generate preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setEditData((prev) => ({ ...prev, profilePicture: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setHasProfilePicture(true);
      console.log("[handleFileChange] Selected file:", file.name);
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
    console.log("[handleRemovePicture] Profile picture removed");
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

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", editData.name);
      formData.append("phoneNumber", editData.phoneNumber);
      formData.append("twoFAEnabled", editData.twoFAEnabled.toString());
      if (editData.profilePicture) {
        formData.append("profilePicture", editData.profilePicture);
        console.log("[handleProfileUpdate] FormData includes profilePicture:", editData.profilePicture.name);
      }

      // Client-side phone number validation
      if (editData.phoneNumber && editData.phoneNumber.trim()) {
        const phoneRegex = /^\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}$/;
        if (!phoneRegex.test(editData.phoneNumber.trim())) {
          console.error("[handleProfileUpdate] Invalid phone number format");
          setError("Invalid phone number format (e.g., +1234567890, 123-456-7890)");
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch("http://localhost:5000/api/patient/profile", {
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

      await fetchUserData();
      setSuccess("Profile updated successfully!");
    } catch (err) {
      console.error("[handleProfileUpdate] Error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Mock data for medical records
  const medicalRecords = [
    {
      id: 1,
      diagnosis: "Hypertension",
      date: "2025-04-20",
      doctor: "Dr. Smith",
      notes: "Prescribed Lisinopril",
    },
    {
      id: 2,
      diagnosis: "Flu",
      date: "2025-03-10",
      doctor: "Dr. Johnson",
      notes: "Rest and hydration",
    },
    {
      id: 3,
      diagnosis: "Allergy",
      date: "2025-02-15",
      doctor: "Dr. Brown",
      notes: "Antihistamines prescribed",
    },
  ];

  // Memoized appointments table
  const appointmentsTable = useMemo(() => {
    if (appointments.length === 0 && !isAppointmentsLoading) {
      return <p className="text-gray-600">{noResultsMessage || "No appointment requests found."}</p>;
    }

    return (
      <div className="overflow-x-auto relative">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Doctor</th>
              <th className="py-3 px-6 text-left">Date</th>
              <th className="py-3 px-6 text-left">Time</th>
              <th className="py-3 px-6 text-left">Reason</th>
              <th className="py-3 px-6 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {appointments.map((appointment) => (
              <tr
                key={appointment._id}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="py-3 px-6">{appointment.doctor?.name || "Unknown Doctor"}</td>
                <td className="py-3 px-6">
                  {appointment.date
                    ? new Date(appointment.date).toISOString().split("T")[0]
                    : "N/A"}
                </td>
                <td className="py-3 px-6">{appointment.time || "N/A"}</td>
                <td className="py-3 px-6">{appointment.reason || "N/A"}</td>
                <td className="py-3 px-6">
                  <span
                    className={`capitalize ${
                      appointment.status === "accepted"
                        ? "text-green-600"
                        : appointment.status === "rejected"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {appointment.status || "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isAppointmentsLoading && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    );
  }, [appointments, isAppointmentsLoading, noResultsMessage]);

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case "appointments":
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">
                Appointment Requests
              </h3>
              <button
                onClick={() => setActiveSection("doctors")}
                className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                Book Appointment
              </button>
            </div>
            {error && (
              <p className="text-red-600 bg-red-100 border border-red-400 rounded p-3 mb-4 animate-fade-in">
                {error}
              </p>
            )}
            <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-Sm">
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">Filter Appointments</h4>
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1 text-blue-600 text-sm font-medium rounded-md hover:bg-blue-50 transition"
                  >
                    Clear Filters
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="timeFilter" className="block text-sm font-medium text-gray-700 mb-1">
                      Time Period
                    </label>
                    <select
                      id="timeFilter"
                      value={timeFilter}
                      onChange={(e) =>
                        handleFilterChange({
                          timeFilter: e.target.value,
                          statusFilter,
                          doctorFilter,
                        })
                      }
                      className="w-full p-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition"
                    >
                      <option value="">All Time</option>
                      <option value="3days">Last 3 Days</option>
                      <option value="week">Last Week</option>
                      <option value="15days">Last 15 Days</option>
                      <option value="month">Last Month</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="statusFilter"
                      value={statusFilter}
                      onChange={(e) =>
                        handleFilterChange({
                          timeFilter,
                          statusFilter: e.target.value,
                          doctorFilter,
                        })
                      }
                      className="w-full p-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition"
                    >
                      <option value="">All Statuses</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="doctorFilter" className="block text-sm font-medium text-gray-700 mb-1">
                      Doctor
                    </label>
                    <select
                      id="doctorFilter"
                      value={doctorFilter}
                      onChange={(e) =>
                        handleFilterChange({
                          timeFilter,
                          statusFilter,
                          doctorFilter: e.target.value,
                        })
                      }
                      className="w-full p-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition"
                    >
                      <option value="">All Doctors</option>
                      {doctors.map((doctor) => (
                        <option key={doctor._id} value={doctor._id}>
                          {doctor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            {appointmentsTable}
          </div>
        );
      case "medicalRecords":
        return (
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Medical Records
            </h3>
            <div className="space-y-6">
              {medicalRecords.map((record) => (
                <div
                  key={record.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
                >
                  <h4 className="text-lg font-semibold text-gray-800">
                    {record.diagnosis}
                  </h4>
                  <p className="text-gray-600">Date: {record.date}</p>
                  <p className="text-gray-600">Doctor: {record.doctor}</p>
                  <p className="text-gray-600">Notes: {record.notes}</p>
                  <button className="mt-4 text-blue-600 hover:text-blue-800">
                    View Full Record
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case "edit-profile":
        return (
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Edit Profile
            </h3>
            <div className="bg-white rounded-lg shadow p-6 max-w-md">
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
              <form onSubmit={handleProfileUpdate}>
                <div className="mb-4">
                  <label
                    htmlFor="name"
                    className="block text-gray-700 font-medium mb-2"
                  >
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editData.name}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="phoneNumber"
                    className="block text-gray-700 font-medium mb-2"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={editData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., +1234567890 or 123-456-7890"
                  />
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="profilePicture"
                    className="block text-gray-700 font-medium mb-2"
                  >
                    Profile Picture
                  </label>
                  {hasProfilePicture && (previewUrl || userData.profilePicture) && (
                    <div className="relative mb-2 w-24 h-24">
                      <img
                        src={
                          previewUrl ||
                          `http://localhost:5000${userData.profilePicture}?t=${Date.now()}`
                        }
                        alt="Profile Preview"
                        className="w-24 h-24 rounded-full object-cover"
                        onError={(e) => console.error("[renderContent] Image load error:", userData.profilePicture, e)}
                      />
                      <button
                        type="button"
                        onClick={handleRemovePicture}
                        className="absolute top-[-8px] right-[-8px] bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition"
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
                      className="w-full p-2 border rounded"
                    />
                  )}
                </div>
                <div className="mb-4 flex items-center">
                  <label
                    htmlFor="twoFAEnabled"
                    className="text-gray-700 font-medium mr-3"
                  >
                    Two-Factor Authentication
                  </label>
                  <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                    <input
                      type="checkbox"
                      id="twoFAEnabled"
                      name="twoFAEnabled"
                      checked={editData.twoFAEnabled}
                      onChange={handleInputChange}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    />
                    <label
                      htmlFor="twoFAEnabled"
                      className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                    ></label>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full p-2 rounded text-white ${
                    isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isLoading ? "Updating..." : "Update Profile"}
                </button>
              </form>
            </div>
          </div>
        );
      case "doctors":
        return (
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              Available Doctors
            </h3>
            {error && (
              <p className="text-red-600 bg-red-100 border border-red-400 rounded p-3 mb-4 animate-fade-in">
                {error}
              </p>
            )}
            {doctors.length === 0 ? (
              <p className="text-gray-600">No doctors available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map((doctor) => (
                  <div
                    key={doctor._id}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
                    onClick={() => {
                      if (doctor._id) {
                        console.log("[DoctorCard] Navigating to doctor profile:", doctor._id);
                        navigate(`/doctor/${doctor._id}`);
                      } else {
                        console.error("[DoctorCard] Missing doctor._id:", doctor);
                        setError("Invalid doctor data. Please try another doctor.");
                      }
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      {doctor.profilePicture && (
                        <img
                          src={`http://localhost:5000${doctor.profilePicture}?t=${Date.now()}`}
                          alt={`${doctor.name}'s Profile`}
                          className="w-16 h-16 rounded-full object-cover"
                          onError={(e) => console.error("[renderContent] Doctor image load error:", doctor.profilePicture, e)}
                        />
                      )}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">
                          {doctor.name}
                        </h4>
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
                    </div>
                    <button
                      className="mt-4 text-blue-600 hover:text-blue-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (doctor._id && typeof doctor._id === "string" && doctor._id.trim() !== "") {
                          console.log("[DoctorCard] Navigating to book-appointment with doctorId:", doctor._id);
                          navigate(`/book-appointment/${doctor._id}`);
                        } else {
                          console.error("[DoctorCard] Invalid doctor._id for booking:", doctor);
                          setError("Invalid doctor ID. Please try another doctor.");
                        }
                      }}
                    >
                      Book Appointment
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-pink-100 flex">
      <div className="w-64 bg-white shadow p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-8">
            Patient Dashboard
          </h2>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection("appointments")}
              className={`w-full flex items-center p-3 rounded text-gray-700 hover:bg-blue-100 ${
                activeSection === "appointments" ? "bg-blue-100 text-blue-600" : ""
              }`}
            >
              <CalendarIcon className="w-6 h-6 mr-3" />
              Appointments
            </button>
            <button
              onClick={() => setActiveSection("medicalRecords")}
              className={`w-full flex items-center p-3 rounded text-gray-700 hover:bg-blue-100 ${
                activeSection === "medicalRecords" ? "bg-blue-100 text-blue-600" : ""
              }`}
            >
              <DocumentTextIcon className="w-6 h-6 mr-3" />
              Medical Records
            </button>
            <button
              onClick={() => setActiveSection("doctors")}
              className={`w-full flex items-center p-3 rounded text-gray-700 hover:bg-blue-100 ${
                activeSection === "doctors" ? "bg-blue-100 text-blue-600" : ""
              }`}
            >
              <UserGroupIcon className="w-6 h-6 mr-3" />
              Doctors
            </button>
            <button
              onClick={() => setActiveSection("edit-profile")}
              className={`w-full flex items-center p-3 rounded text-gray-700 hover:bg-blue-100 ${
                activeSection === "edit-profile" ? "bg-blue-100 text-blue-600" : ""
              }`}
            >
              <PencilIcon className="w-6 h-6 mr-3" />
              Edit Profile
            </button>
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center p-3 text-white bg-red-600 rounded hover:bg-red-700 transition"
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
                onError={(e) => console.error("[header] Image load error:", userData.profilePicture, e)}
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Welcome, {userData.name || "Loading..."}!
              </h1>
              <p className="text-gray-600">
                Manage your health and appointments from your dashboard.
              </p>
            </div>
          </div>
          {error && activeSection !== "appointments" && (
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