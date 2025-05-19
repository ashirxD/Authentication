import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import {
  PatientSidebar,
  PatientHeader,
  AppointmentsSection,
  MedicalRecordsSection,
  EditProfileSection,
  DoctorsSection,
} from "./Components/PatientComponents";
import io from "socket.io-client";
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
  const [notifications, setNotifications] = useState([]);
  const [timeFilter, setTimeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [socketStatus, setSocketStatus] = useState("disconnected"); // Track socket status
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Initialize Socket.IO
  const socket = useMemo(() => {
    const token = localStorage.getItem("token") || "";
    console.log("[Socket.IO] Initializing with token:", token.slice(0, 20) + "...");
    return io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }, []);

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

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/patient/user`, {
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

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/patient/doctors`, {
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

      const url = `${import.meta.env.VITE_API_URL}/api/patient/appointments?${queryParams.toString()}`;
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

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchNotifications] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[fetchNotifications] Response:", data);

      if (!response.ok) {
        console.error("[fetchNotifications] Failed:", data.message);
        setError(data.message || "Failed to fetch notifications");
        return;
      }

      if (!Array.isArray(data)) {
        console.warn("[fetchNotifications] Response is not an array:", data);
        setError("Invalid response format from server");
        return;
      }

      setNotifications(data);
    } catch (err) {
      console.error("[fetchNotifications] Error:", err);
      setError("Something went wrong while fetching notifications. Please try again.");
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[markNotificationAsRead] No token found, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[markNotificationAsRead] Response:", data);

      if (!response.ok) {
        console.error("[markNotificationAsRead] Failed:", data.message);
        setError(data.message || "Failed to mark notification as read");
        return;
      }

      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (err) {
      console.error("[markNotificationAsRead] Error:", err);
      setError("Something went wrong while marking notification as read.");
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

  // Toggle notifications dropdown
  const toggleNotifications = () => {
    setShowNotifications((prev) => {
      if (!prev) {
        fetchNotifications();
      }
      return !prev;
    });
  };

  // Handle Socket.IO events
  useEffect(() => {
    socket.on("connect", () => {
      console.log("[Socket.IO] Connected to server");
      setSocketStatus("connected");
      const token = localStorage.getItem("token") || "";
      const cleanToken = token.replace(/^Bearer\s+/i, "");
      console.log("[Socket.IO] Emitting authenticate with token:", cleanToken.slice(0, 20) + "...");
      socket.emit("authenticate", cleanToken);
    });

    socket.on("authenticated", () => {
      console.log("[Socket.IO] Successfully authenticated");
      setSocketStatus("authenticated");
    });

    socket.on("error", (error) => {
      console.error("[Socket.IO] Server error:", error);
      setError(`Socket error: ${error}`);
      setSocketStatus("error");
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket.IO] Connection error:", err.message);
      setError(`Socket connection failed: ${err.message}`);
      setSocketStatus("error");
    });

    socket.on("appointmentUpdate", (data) => {
      console.log("[Socket.IO] Received appointmentUpdate:", data);
      setNotifications((prev) => {
        const newNotification = {
          _id: data.notificationId || `temp-${Date.now()}`,
          message: data.message || `Appointment ${data.status}`,
          type: data.status === "accepted" ? "appointment_accepted" : "appointment_rejected",
          appointmentId: data.requestId,
          createdAt: new Date(),
          read: false,
        };
        console.log("[Socket.IO] Adding notification:", newNotification);
        return [newNotification, ...prev];
      });
    });

    socket.on("appointmentRequestSent", (data) => {
      console.log("[Socket.IO] Received appointmentRequestSent:", data);
      setNotifications((prev) => {
        const newNotification = {
          _id: data.notificationId || `temp-${Date.now()}`,
          message: data.message || "Appointment request sent",
          type: "appointment_request",
          appointmentId: data.requestId,
          createdAt: new Date(),
          read: false,
        };
        console.log("[Socket.IO] Adding notification:", newNotification);
        return [newNotification, ...prev];
      });
    });

    socket.on("disconnect", () => {
      console.log("[Socket.IO] Disconnected from server");
      setSocketStatus("disconnected");
    });

    return () => {
      socket.off("connect");
      socket.off("authenticated");
      socket.off("error");
      socket.off("connect_error");
      socket.off("appointmentUpdate");
      socket.off("appointmentRequestSent");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [socket]);

  // Initial fetch
  useEffect(() => {
    fetchUserData();
    fetchDoctors();
    fetchNotifications();
    if (activeSection === "appointments") {
      debouncedFetchAppointments({ timeFilter, statusFilter, doctorFilter });
    }
  }, [activeSection, debouncedFetchAppointments]);

  // Handle logout
  const handleLogout = () => {
    console.log("[handleLogout] Logging out");
    localStorage.removeItem("token");
    socket.disconnect();
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

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/patient/profile`, {
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
      date: "2025-04-20 Atlantica/Tierra",
      doctor: "Dr. Smith",
      notes: "Prescribed Lisinopril",
    },
    {
      id: 2,
      diagnosis: "Flu",
      date: "2025-03-10 Atlantica/Tierra",
      doctor: "Dr. Johnson",
      notes: "Rest and hydration",
    },
    {
      id: 3,
      diagnosis: "Allergy",
      date: "2025-02-15 Atlantica/Tierra",
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
          <AppointmentsSection
            error={error}
            appointmentsTable={appointmentsTable}
            setActiveSection={setActiveSection}
            timeFilter={timeFilter}
            statusFilter={statusFilter}
            doctorFilter={doctorFilter}
            handleFilterChange={handleFilterChange}
            clearFilters={clearFilters}
            doctors={doctors}
          />
        );
      case "medicalRecords":
        return <MedicalRecordsSection medicalRecords={medicalRecords} />;
      case "edit-profile":
        return (
          <EditProfileSection
            success={success}
            error={error}
            editData={editData}
            handleInputChange={handleInputChange}
            handleFileChange={handleFileChange}
            handleRemovePicture={handleRemovePicture}
            handleProfileUpdate={handleProfileUpdate}
            isLoading={isLoading}
            hasProfilePicture={hasProfilePicture}
            previewUrl={previewUrl}
            userData={userData}
          />
        );
      case "doctors":
        return (
          <DoctorsSection
            doctors={doctors}
            error={error}
            navigate={navigate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-pink-100 flex">
      <PatientSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        handleLogout={handleLogout}
      />
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <PatientHeader
            userData={userData}
            notifications={notifications}
            toggleNotifications={toggleNotifications}
            showNotifications={showNotifications}
            markNotificationAsRead={markNotificationAsRead}
            error={error}
            socketStatus={socketStatus} // Pass for debugging
          />
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