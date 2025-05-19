import {
  CalendarIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar({ activeSection, setActiveSection, handleLogout }) {
  return (
    <div className="w-64 bg-white shadow-lg p-6 flex flex-col justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-8">
          Doctor Dashboard
        </h2>
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
              activeSection === "appointment-requests" ? "bg-blue-100 text-blue-600" : ""
            }`}
          >
            <ClipboardDocumentListIcon className="w-6 h-6 mr-3" />
            Appointment Requests
          </button>
          <button
            onClick={() => setActiveSection("edit-profile")}
            className={`w-full flex items-center p-3 rounded-lg text-gray-700 hover:bg-blue-100 transition ${
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
        className="flex items-center p-3 text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
      >
        <ArrowRightOnRectangleIcon className="w-6 h-6 mr-3" />
        Logout
      </button>
    </div>
  );
}