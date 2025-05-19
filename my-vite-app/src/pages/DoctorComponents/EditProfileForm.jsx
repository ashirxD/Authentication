import { XMarkIcon } from "@heroicons/react/24/outline";

export default function EditProfileForm({
  editData,
  availability,
  handleInputChange,
  handleFileChange,
  handleRemovePicture,
  handleProfileUpdate,
  hasProfilePicture,
  previewUrl,
  userData,
  isLoading,
  error,
  success,
  daysOfWeek,
}) {
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
                    console.error("[EditProfileForm] Image load error:", userData.profilePicture, e)
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
}