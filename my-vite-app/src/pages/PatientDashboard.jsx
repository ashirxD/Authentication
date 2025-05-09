import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, DocumentTextIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

export default function PatientDashboard() {
  const [userData, setUserData] = useState({ name: "", role: "" });
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("appointments");
  const navigate = useNavigate();

  // Fetch user data and enforce patient-only access
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/signin");
          return;
        }

        const response = await fetch("http://localhost:5000/api/user", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log("Patient dashboard user data:", data);

        if (!response.ok) {
          setError(data.message || "Failed to fetch user data");
          localStorage.removeItem("token");
          navigate("/signin");
          return;
        }

        if (data.role !== "patient") {
          setError("Access denied: Not a patient");
          localStorage.removeItem("token");
          navigate("/signin");
          return;
        }

        setUserData({ name: data.name, role: data.role });
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Something went wrong. Please try again.");
        localStorage.removeItem("token");
        navigate("/signin");
      }
    };

    fetchUserData();
  }, [navigate]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/signin");
  };

  // Mock data for appointments
  const appointments = [
    { id: 1, doctor: "Dr. Smith", date: "2025-05-10", time: "10:00 AM", reason: "Routine Checkup" },
    { id: 2, doctor: "Dr. Johnson", date: "2025-05-12", time: "2:00 PM", reason: "Follow-up" },
    { id: 3, doctor: "Dr. Brown", date: "2025-05-15", time: "9:30 AM", reason: "Consultation" },
  ];

  // Mock data for medical records
  const medicalRecords = [
    { id: 1, diagnosis: "Hypertension", date: "2025-04-20", doctor: "Dr. Smith", notes: "Prescribed Lisinopril" },
    { id: 2, diagnosis: "Flu", date: "2025-03-10", doctor: "Dr. Johnson", notes: "Rest and hydration" },
    { id: 3, diagnosis: "Allergy", date: "2025-02-15", doctor: "Dr. Brown", notes: "Antihistamines prescribed" },
  ];

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case "appointments":
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-gray-800">Upcoming Appointments</h3>
              <button className="p-2 text-white rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-300 transition-all duration-300">
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
                    <tr key={appointment.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-6">{appointment.doctor}</td>
                      <td className="py-3 px-6">{appointment.date}</td>
                      <td className="py-3 px-6">{appointment.time}</td>
                      <td className="py-3 px-6">{appointment.reason}</td>
                      <td className="py-3 px-6 text-center">
                        <button className="text-blue-600 hover:text-blue-800">View Details</button>
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
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Medical Records</h3>
            <div className="space-y-6">
              {medicalRecords.map((record) => (
                <div key={record.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                  <h4 className="text-lg font-semibold text-gray-800">{record.diagnosis}</h4>
                  <p className="text-gray-600">Date: {record.date}</p>
                  <p className="text-gray-600">Doctor: {record.doctor}</p>
                  <p className="text-gray-600">Notes: {record.notes}</p>
                  <button className="mt-4 text-blue-600 hover:text-blue-800">View Full Record</button>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Patient Dashboard</h2>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection("appointments")}
              className={`w-full flex items-center p-3 rounded-lg text-gray-700 hover:bg-blue-100 transition ${
                activeSection === "appointments" ? "bg-blue-100 text-blue-600" : ""
              }`}
            >
              <CalendarIcon className="w-6 h-6 mr-3" />
              Appointments
            </button>
            <button
              onClick={() => setActiveSection("medicalRecords")}
              className={`w-full flex items-center p-3 rounded-lg text-gray-700 hover:bg-blue-100 transition ${
                activeSection === "medicalRecords" ? "bg-blue-100 text-blue-600" : ""
              }`}
            >
              <DocumentTextIcon className="w-6 h-6 mr-3" />
              Medical Records
            </button>
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center p-3 text-white rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-4 focus:ring-red-300 transition-all duration-300"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6 mr-3" />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-800">Welcome, {userData.name || "Loading..."}!</h1>
            <p className="text-gray-600">Manage your health and appointments from your dashboard.</p>
          </div>
          {error && (
            <p className="text-red-600 bg-red-100 border border-red-400 rounded-md p-3 mb-6 font-semibold text-base">
              {error}
            </p>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}