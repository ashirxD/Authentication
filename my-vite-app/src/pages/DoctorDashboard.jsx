import React from "react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout, setAvailability as setReduxAvailability } from "../redux/slices/authSlice";
import { useAvailability } from "../context/AvailabilityContext";
import io from "socket.io-client";
import {
  Sidebar,
  Header,
  AppointmentsTable,
  PatientsList,
  AppointmentRequestsTable,
  EditProfileForm,
  NotificationsList,
} from "./Components/DoctorComponents";

// Log API URL for debugging
console.log("[DoctorDashboard] VITE_API_URL:", import.meta.env.VITE_API_URL);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-600 bg-red-100 border border-red-400 rounded p-3">
          <h3>Render Error</h3>
          <p>{this.state.error?.message || "Unknown rendering error"}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DoctorDashboard() {
  console.log("[DoctorDashboard] Rendering");
  const { availability, dispatch: contextDispatch } = useAvailability() || {};
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
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("appointments");
  const [appointmentRequests, setAppointmentRequests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [socketStatus, setSocketStatus] = useState("disconnected"); // Track socket status
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const reduxUser = useSelector((state) => state.auth.user) || null;

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

  // Normalize time format
  const normalizeTime = (time) => {
    if (!time || typeof time !== "string" || time.trim() === "") {
      console.warn("[normalizeTime] Invalid time:", time);
      return "";
    }
    try {
      const [hours, minutes] = time.split(":").slice(0, 2);
      return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    } catch (err) {
      console.error("[normalizeTime] Error:", time, err);
      return time;
    }
  };

  // Fetch user data
  const fetchUserData = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchUserData] No token, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/doctor/user`;
      console.log("[fetchUserData] Fetching:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("[fetchUserData] Status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error("[fetchUserData] Failed:", text);
        setError("Failed to fetch user data");
        localStorage.removeItem("token");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }
      const data = await response.json();
      console.log("[fetchUserData] Data:", data);
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
        profilePicture,
        twoFAEnabled: !!data.twoFAEnabled,
      });
      setHasProfilePicture(!!profilePicture);
      if (data.availability) {
        dispatch(setReduxAvailability({
          days: data.availability.days || [],
          startTime: data.availability.startTime || "",
          endTime: data.availability.endTime || "",
        }));
      }
    } catch (err) {
      console.error("[fetchUserData] Error:", err);
      setError("Failed to connect to server");
      localStorage.removeItem("token");
      dispatch(logout());
      navigate("/auth/signin", { replace: true });
    }
  };

  // Fetch appointment requests
  const fetchAppointmentRequests = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchAppointmentRequests] No token, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/doctor/appointment/requests`;
      console.log("[fetchAppointmentRequests] Fetching:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("[fetchAppointmentRequests] Status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error("[fetchAppointmentRequests] Failed:", text);
        setError("Failed to fetch appointment requests");
        setAppointmentRequests([]);
        return;
      }
      const data = await response.json();
      console.log("[fetchAppointmentRequests] Data:", data);
      setAppointmentRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[fetchAppointmentRequests] Error:", err);
      setError("Failed to fetch appointment requests");
      setAppointmentRequests([]);
    }
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchAppointments] No token, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/doctor/appointments`;
      console.log("[fetchAppointments] Fetching:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("[fetchAppointments] Status:", response.status);
      const text = await response.text();
      console.log("[fetchAppointments] Raw response:", text);
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("[fetchAppointments] Invalid JSON:", text);
        setError("Invalid server response");
        setAppointments([]);
        return;
      }
      if (!response.ok) {
        console.error("[fetchAppointments] Failed:", data.message || text);
        setError(data.message || "Failed to fetch appointments");
        setAppointments([]);
        return;
      }
      console.log("[fetchAppointments] Data:", data);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[fetchAppointments] Error:", err);
      setError("Failed to fetch appointments");
      setAppointments([]);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[fetchNotifications] No token, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/notifications`;
      console.log("[fetchNotifications] Fetching:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("[fetchNotifications] Status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error("[fetchNotifications] Failed:", text);
        setError("Failed to fetch notifications");
        setNotifications([]);
        return;
      }
      const data = await response.json();
      console.log("[fetchNotifications] Data:", data);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[fetchNotifications] Error:", err);
      setError("Failed to fetch notifications");
      setNotifications([]);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[markNotificationAsRead] No token, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/notifications/${notificationId}/read`;
      console.log("[markNotificationAsRead] Fetching:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("[markNotificationAsRead] Status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error("[markNotificationAsRead] Failed:", text);
        setError("Failed to mark notification as read");
        return;
      }
      const data = await response.json();
      console.log("[markNotificationAsRead] Data:", data);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error("[markNotificationAsRead] Error:", err);
      setError("Failed to mark notification as read");
    }
  };

  // Main effect for initialization
  useEffect(() => {
    console.log("[useEffect] activeSection:", activeSection, "showNotifications:", showNotifications);
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("[useEffect] No token, redirecting to signin");
      navigate("/auth/signin", { replace: true });
      return;
    }

    const initialize = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchUserData(),
        activeSection === "appointment-requests" && fetchAppointmentRequests(),
        (activeSection === "patients" || activeSection === "appointments") && fetchAppointments(),
        showNotifications && fetchNotifications(),
      ]);
      setIsLoading(false);
    };

    initialize();

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

    socket.on("newAppointmentRequest", (request) => {
      console.log("[Socket.IO] New appointment request:", request);
      setNotifications((prev) => {
        const newNotification = {
          _id: request.notificationId || `temp-${Date.now()}`,
          message: request.message || `New appointment request from ${request.patient?.name || "Unknown"}`,
          type: "appointment_request",
          appointmentId: request,
          read: false,
          createdAt: new Date(),
        };
        console.log("[Socket.IO] Adding notification:", newNotification);
        return [newNotification, ...prev];
      });
      if (activeSection === "appointment-requests") {
        fetchAppointmentRequests();
      }
    });

    socket.on("appointmentUpdate", ({ requestId, status, message, notificationId }) => {
      console.log("[Socket.IO] Appointment update:", { requestId, status, message, notificationId });
      setNotifications((prev) => {
        const newNotification = {
          _id: notificationId || `temp-${Date.now()}`,
          message: message || `Appointment ${status}`,
          type: `appointment_${status}`,
          appointmentId: { _id: requestId },
          read: false,
          createdAt: new Date(),
        };
        console.log("[Socket.IO] Adding notification:", newNotification);
        return [newNotification, ...prev];
      });
      if (activeSection === "appointment-requests") {
        fetchAppointmentRequests();
      }
      if (activeSection === "appointments" && status === "accepted") {
        fetchAppointments();
      }
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
      socket.off("newAppointmentRequest");
      socket.off("appointmentUpdate");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [navigate, activeSection, showNotifications, dispatch, socket]);

  // Handle logout
  const handleLogout = () => {
    console.log("[handleLogout] Logging out");
    localStorage.removeItem("token");
    socket.disconnect();
    dispatch(logout());
    navigate("/auth/signin", { replace: true });
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log("[handleInputChange] Input:", { name, value, type, checked });
    if (name === "days") {
      const newDays = checked
        ? [...(availability?.days || []), value]
        : (availability?.days || []).filter((day) => day !== value);
      if (contextDispatch) {
        contextDispatch({ type: "SET_AVAILABILITY", payload: { ...availability, days: newDays } });
      }
      dispatch(setReduxAvailability({ ...availability, days: newDays }));
    } else if (name === "startTime" || name === "endTime") {
      if (contextDispatch) {
        contextDispatch({ type: "SET_AVAILABILITY", payload: { ...availability, [name]: value } });
      }
      dispatch(setReduxAvailability({ ...availability, [name]: value }));
    } else {
      setEditData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // Handle profile picture file change
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

  // Handle profile picture removal
  const handleRemovePicture = async () => {
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[handleRemovePicture] No token, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }
      if (!editData.name) {
        console.error("[handleRemovePicture] Name missing:", editData);
        setError("Cannot remove picture: User name is missing");
        return;
      }
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/doctor/profile`;
      console.log("[handleRemovePicture] Fetching:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profilePicture: null,
          name: editData.name,
        }),
      });
      console.log("[handleRemovePicture] Status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error("[handleRemovePicture] Failed:", text);
        setError("Failed to remove profile picture");
        return;
      }
      const data = await response.json();
      console.log("[handleRemovePicture] Data:", data);
      setUserData((prev) => ({ ...prev, profilePicture: null }));
      setEditData((prev) => ({ ...prev, profilePicture: null }));
      setPreviewUrl("");
      setHasProfilePicture(false);
      setSuccess("Profile picture removed successfully");
      dispatch({ type: "auth/updateProfilePicture", payload: null });
    } catch (err) {
      console.error("[handleRemovePicture] Error:", err);
      setError("Failed to connect to server");
    }
  };

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    if (!availability?.startTime || !availability?.endTime) {
      setError("Please provide both start and end times");
      setIsLoading(false);
      return;
    }
    if (!availability?.days || availability.days.length === 0) {
      setError("Please select at least one shift day");
      setIsLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[handleProfileUpdate] No token, redirecting to signin");
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
      if (editData.profilePicture instanceof File) {
        formData.append("profilePicture", editData.profilePicture);
      }
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/doctor/profile`;
      console.log("[handleProfileUpdate] Fetching:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      console.log("[handleProfileUpdate] Status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error("[handleProfileUpdate] Failed:", text);
        setError("Failed to update profile");
        setIsLoading(false);
        return;
      }
      const data = await response.json();
      console.log("[handleProfileUpdate] Data:", data);
      setUserData({
        ...userData,
        name: data.user.name || editData.name,
        specialization: data.user.specialization || editData.specialization,
        profilePicture: data.user.profilePicture || null,
        twoFAEnabled: data.user.twoFAEnabled || editData.twoFAEnabled,
      });
      setEditData({
        name: data.user.name || editData.name,
        specialization: data.user.specialization || editData.specialization,
        profilePicture: data.user.profilePicture || null,
        twoFAEnabled: data.user.twoFAEnabled || editData.twoFAEnabled,
      });
      setHasProfilePicture(!!data.user.profilePicture);
      setPreviewUrl(data.user.profilePicture ? `${import.meta.env.VITE_API_URL}${data.user.profilePicture}?t=${Date.now()}` : "");
      dispatch({ type: "auth/updateProfilePicture", payload: data.user.profilePicture || null });
      dispatch(setReduxAvailability({
        startTime: data.user.availability?.startTime || availability.startTime,
        endTime: data.user.availability?.endTime || availability.endTime,
        days: data.user.availability?.days || availability.days,
      }));
      setSuccess("Profile updated successfully");
    } catch (err) {
      console.error("[handleProfileUpdate] Error:", err);
      setError("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle accept appointment request
  const handleAcceptRequest = async (requestId) => {
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[handleAcceptRequest] No token, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/doctor/appointment/accept`;
      console.log("[handleAcceptRequest] Fetching:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });
      console.log("[handleAcceptRequest] Status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error("[handleAcceptRequest] Failed:", text);
        setError("Failed to accept appointment request");
        return;
      }
      const data = await response.json();
      console.log("[handleAcceptRequest] Data:", data);
      setAppointmentRequests((prev) => prev.filter((req) => req._id !== requestId));
      setSuccess("Appointment request accepted");
      if (activeSection === "appointments") {
        fetchAppointments();
      }
    } catch (err) {
      console.error("[handleAcceptRequest] Error:", err);
      setError("Failed to accept the request");
    }
  };

  // Handle reject appointment request
  const handleRejectRequest = async (requestId) => {
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[handleRejectRequest] No token, redirecting to signin");
        dispatch(logout());
        navigate("/auth/signin", { replace: true });
        return;
      }
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/doctor/appointment/reject`;
      console.log("[handleRejectRequest] Fetching:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });
      console.log("[handleRejectRequest] Status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error("[handleRejectRequest] Failed:", text);
        setError("Failed to reject appointment request");
        return;
      }
      const data = await response.json();
      console.log("[handleRejectRequest] Data:", data);
      setAppointmentRequests((prev) => prev.filter((req) => req._id !== requestId));
      setSuccess("Appointment request rejected");
    } catch (err) {
      console.error("[handleRejectRequest] Error:", err);
      setError("Failed to reject the request");
    }
  };

  // Toggle notifications
  const toggleNotifications = () => {
    setShowNotifications((prev) => {
      if (!prev) {
        fetchNotifications();
      }
      return !prev;
    });
  };

  // Render content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    // Compute unique patients
    const uniquePatients = Array.isArray(appointments)
      ? Array.from(
          new Map(
            appointments.map((appt) => [
              appt.patient?._id?.toString(),
              {
                _id: appt.patient?._id,
                name: appt.patient?.name || "Unknown Patient",
                phoneNumber: appt.patient?.phoneNumber || "N/A",
                email: appt.patient?.email || "N/A",
                profilePicture: appt.patient?.profilePicture || null,
              },
            ])
          ).values()
        ).filter((patient) => patient._id)
      : [];

    switch (activeSection) {
      case "appointments":
        return (
          <ErrorBoundary>
            <AppointmentsTable appointments={appointments} error={error} />
          </ErrorBoundary>
        );
      case "patients":
        return (
          <ErrorBoundary>
            <PatientsList uniquePatients={uniquePatients} error={error} />
          </ErrorBoundary>
        );
      case "appointment-requests":
        return (
          <ErrorBoundary>
            <AppointmentRequestsTable
              appointmentRequests={appointmentRequests}
              error={error}
              success={success}
              handleAcceptRequest={handleAcceptRequest}
              handleRejectRequest={handleRejectRequest}
            />
          </ErrorBoundary>
        );
      case "edit-profile":
        return (
          <ErrorBoundary>
            <EditProfileForm
              editData={editData}
              availability={availability || { days: [], startTime: "", endTime: "" }}
              handleInputChange={handleInputChange}
              handleFileChange={handleFileChange}
              handleRemovePicture={handleRemovePicture}
              handleProfileUpdate={handleProfileUpdate}
              hasProfilePicture={hasProfilePicture}
              previewUrl={previewUrl}
              error={error}
              success={success}
              isLoading={isLoading}
            />
          </ErrorBoundary>
        );
      default:
        return (
          <div className="text-gray-600">
            Invalid section selected. Please choose a valid section.
          </div>
        );
    }
  };

  // Redirect to signin if no token
  if (!localStorage.getItem("token")) {
    console.log("[DoctorDashboard] No token, redirecting to signin");
    navigate("/auth/signin", { replace: true });
    return null;
  }

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
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        handleLogout={handleLogout}
      />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <Header
            userData={userData}
            availability={availability || { days: [], startTime: "", endTime: "" }}
            notifications={notifications}
            toggleNotifications={toggleNotifications}
            showNotifications={showNotifications}
            markNotificationAsRead={markNotificationAsRead}
            error={error}
            socketStatus={socketStatus} // Pass socket status for debugging
          />
          {renderContent()}
        </div>
      </div>
    </div>
  );
}