import React from 'react';
import {
  CalendarIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  XMarkIcon,
  UserGroupIcon,
  BellIcon,
} from "@heroicons/react/24/outline";

// Sidebar Component
export function PatientSidebar({ activeSection, setActiveSection, handleLogout }) {
  console.log("[PatientSidebar] Rendering, activeSection:", activeSection);
  return (
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
  );
}

// Header Component
export function PatientHeader({
  userData = {},
  notifications = [],
  unreadCount = 0,
  toggleNotifications,
  showNotifications,
  markNotificationAsRead,
  socketStatus,
}) {
  console.log("[PatientHeader] Rendering, props:", {
    userData: userData.name,
    unreadCount,
    notificationsLength: notifications.length,
    notificationIds: notifications.map(n => n._id),
    showNotifications,
    socketStatus,
  });

  return (
    <div key={`header-${unreadCount}`} className="mb-8 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {userData.profilePicture && userData.profilePicture !== "" && (
          <img
            src={`${import.meta.env.VITE_API_URL}${userData.profilePicture}?t=${Date.now()}`}
            alt="Profile"
            className="w-12 h-12 rounded-full object-cover"
            onError={(e) => {
              e.target.src = "/fallback-profile.png";
              console.error("[PatientHeader] Image error:", userData.profilePicture, e);
            }}
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
      <div className="relative">
        <button
          onClick={toggleNotifications}
          className="relative focus:outline-none p-2 rounded-full hover:bg-blue-100 transition"
          aria-label="Notifications"
        >
          <BellIcon className="h-6 w-6 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        {showNotifications && (
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto animate-fade-in">
            <div className="p-4">
              <NotificationsList
                notifications={notifications}
                markNotificationAsRead={markNotificationAsRead}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Notifications List Component
export function NotificationsList({ notifications = [], markNotificationAsRead }) {
  console.log("[NotificationsList] Rendering, notifications:", notifications);
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Notifications</h3>
      {notifications.length === 0 ? (
        <p className="text-gray-600">No notifications.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => (
            <li
              key={notification?._id || `notif-${Date.now()}`}
              className={`p-3 rounded-lg transition ${
                notification.read ? "bg-gray-100" : "bg-blue-50"
              } hover:bg-blue-100`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-800">{notification?.message || "No message"}</p>
                  <p className="text-xs text-gray-500">
                    {notification?.createdAt
                      ? new Date(notification.createdAt).toLocaleString()
                      : "Unknown time"}
                  </p>
                </div>
                {!notification.read && (
                  <button
                    onClick={() => markNotificationAsRead(notification._id)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Appointments Section
export function AppointmentsSection({
  error,
  appointmentsTable,
  setActiveSection,
  timeFilter,
  statusFilter,
  doctorFilter,
  handleFilterChange,
  clearFilters,
  doctors,
}) {
  console.log("[AppointmentsSection] Rendering, filters:", { timeFilter, statusFilter, doctorFilter });
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
      <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
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
}

// Medical Records Section
export function MedicalRecordsSection({ medicalRecords }) {
  console.log("[MedicalRecordsSection] Rendering, records:", medicalRecords.length);
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
}

// Edit Profile Section
export function EditProfileSection({
  success,
  error,
  editData,
  handleInputChange,
  handleFileChange,
  handleRemovePicture,
  handleProfileUpdate,
  isLoading,
  hasProfilePicture,
  previewUrl,
  userData,
}) {
  console.log("[EditProfileSection] Rendering, editData:", editData);
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
              value={editData.name || ""}
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
              value={editData.phoneNumber || ""}
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
                    `${import.meta.env.VITE_API_URL}${userData.profilePicture}?t=${Date.now()}`
                  }
                  alt="Profile Preview"
                  className="w-24 h-24 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = "/fallback-profile.png";
                    console.error("[EditProfileSection] Image error:", userData.profilePicture, e);
                  }}
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
          <div className="mb-4 flex items-center space-x-4">
            <label
              htmlFor="twoFAEnabled"
              className="text-gray-700 font-medium"
            >
              Two-Factor Authentication
            </label>
            <div className="relative inline-block w-12 h-6">
              <input
                type="checkbox"
                id="twoFAEnabled"
                name="twoFAEnabled"
                checked={editData.twoFAEnabled || false}
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
}

// Doctors Section
export function DoctorsSection({ doctors, error, navigate }) {
  console.log("[DoctorsSection] Rendering, doctors:", doctors.length);
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
                  navigate(`/doctor/${doctor._id}`);
                }
              }}
            >
              <div className="flex items-center space-x-4">
                {doctor.profilePicture && (
                  <img
                    src={`${import.meta.env.VITE_API_URL}${doctor.profilePicture}?t=${Date.now()}`}
                    alt={`${doctor.name}'s Profile`}
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      e.target.src = "/fallback-profile.png";
                      console.error("[DoctorsSection] Image error:", doctor.profilePicture, e);
                    }}
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
                    navigate(`/book-appointment/${doctor._id}`);
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
}