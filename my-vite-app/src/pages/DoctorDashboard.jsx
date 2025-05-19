import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout, setAvailability } from "../redux/slices/authSlice";
import { useAvailability } from "../context/AvailabilityContext";
import {
  Sidebar,
  Header,
  AppointmentsTable,
  PatientsList,
  AppointmentRequestsTable,
  EditProfileForm,
} from "./Components/DoctorComponents";

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
          profilePicture: appt.patient?.profilePicture || null,
        },
      ])
    ).values()
  ).filter((patient) => patient._id);

  const renderContent = () => {
    switch (activeSection) {
      case "appointments":
        return <AppointmentsTable appointments={appointments} error={error} />;
      case "patients":
        return <PatientsList uniquePatients={uniquePatients} error={error} />;
      case "appointment-requests":
        return (
          <AppointmentRequestsTable
            appointmentRequests={appointmentRequests}
            error={error}
            success={success}
            handleAcceptRequest={handleAcceptRequest}
            handleRejectRequest={handleRejectRequest}
          />
        );
      case "edit-profile":
        return (
          <EditProfileForm
            editData={editData}
            availability={availability}
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
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} handleLogout={handleLogout} />
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <Header userData={userData} availability={availability} />
          {renderContent()}
        </div>
      </div>
    </div>
  );
}