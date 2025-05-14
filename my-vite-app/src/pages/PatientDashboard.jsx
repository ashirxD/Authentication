import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import {
  CalendarIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function PatientDashboard() {
  const [userData, setUserData] = useState({
    name: "",
    role: "",
    profilePicture: "",
    twoFAEnabled: false,
  });
  const [editData, setEditData] = useState({
    name: "",
    profilePicture: null,
    twoFAEnabled: false,
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [hasProfilePicture, setHasProfilePicture] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("appointments");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, redirecting to signin");
        navigate("/auth/signin");
        return;
      }

      console.log("Fetching user data with token:", token);
      const response = await fetch("http://localhost:5000/api/patient/user", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("Fetch user data response:", data);

      if (!response.ok) {
        console.error("Fetch user data failed:", data.message);
        setError(data.message || "Failed to fetch user data");
        localStorage.removeItem("token");
        navigate("/auth/signin");
        return;
      }

      if (data.role !== "patient") {
        console.error("Access denied: Not a patient");
        setError("Access denied: Not a patient");
        localStorage.removeItem("token");
        navigate("/auth/signin");
        return;
      }

      const userInfo = {
        name: data.name || "",
        role: data.role || "",
        profilePicture: data.profilePicture || "",
        twoFAEnabled: !!data.twoFAEnabled,
      };

      setUserData(userInfo);
      setEditData({
        name: data.name || "",
        profilePicture: null,
        twoFAEnabled: !!data.twoFAEnabled,
      });
      setHasProfilePicture(!!data.profilePicture);
      setPreviewUrl("");
      console.log("Set editData.twoFAEnabled:", data.twoFAEnabled);
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
    setEditData((prev) => {
      const newData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      console.log("Updated editData:", newData);
      if (name === "twoFAEnabled") {
        console.log(`Toggle changed to: ${checked ? "ON" : "OFF"}`);
      }
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

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", editData.name);
      formData.append("twoFAEnabled", editData.twoFAEnabled.toString());
      if (editData.profilePicture) {
        formData.append("profilePicture", editData.profilePicture);
        console.log("FormData includes profilePicture:", editData.profilePicture.name);
      }

      for (let [key, value] of formData.entries()) {
        console.log(`FormData entry: ${key}=${value instanceof File ? value.name : value}`);
      }

      const response = await fetch("http://localhost:5000/api/patient/profile", {
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

      await fetchUserData();
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
      doctor: "Dr. Smith",
      date: "2025-05-10",
      time: "10:00 AM",
      reason: "Routine Checkup",
    },
    {
      id: 2,
      doctor: "Dr. Johnson",
      date: "2025-05-12",
      time: "2:00 PM",
      reason: "Follow-up",
    },
    {
      id: 3,
      doctor: "Dr. Brown",
      date: "2025-05-15",
      time: "9:30 AM",
      reason: "Consultation",
    },
  ];

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

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case "appointments":
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">
                Upcoming Appointments
              </h3>
              {/* Updated to navigate to BookAppointment page */}
              <button
                onClick={() => navigate("/book-appointment")}
                className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                Book Appointment
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                    <th className="py-3 px-6 text-left">Doctor</th>
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
                      <td className="py-3 px-6">{appointment.doctor}</td>
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
                    htmlFor="profilePicture"
                    className="block text-gray-700 font-medium mb-2"
                  >
                    Profile Picture
                  </label>
                  {/* Updated cross icon position to top-right with slight overlap */}
                  {hasProfilePicture && (previewUrl || userData.profilePicture) && (
                    <div className="relative mb-2 w-24 h-24">
                      <img
                        src={
                          previewUrl ||
                          `http://localhost:5000${userData.profilePicture}?t=${Date.now()}`
                        }
                        alt="Profile Preview"
                        className="w-24 h-24 rounded-full object-cover"
                        onError={(e) => console.error("Image load error:", userData.profilePicture, e)}
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
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-pink-100 flex">
      <style jsx>{`
        .toggle-checkbox {
          appearance: none;
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: white;
          border: 4px solid #d1d5db;
          cursor: pointer;
          transition: all 0.2s ease-in;
        }
        .toggle-checkbox:checked {
          right: 0;
          border-color: #2563eb;
        }
        .toggle-label {
          display: block;
          overflow-hidden;
          height: 24px;
          border-radius: 9999px;
          background: #d1d5db;
          cursor: pointer;
          transition: background-color 0.2s ease-in;
        }
        .toggle-checkbox:checked + .toggle-label {
          background: #2563eb;
        }
      `}</style>
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
                onError={(e) => console.error("Header image load error:", userData.profilePicture, e)}
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