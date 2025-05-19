export default function ProfileHeader({ userData, availability }) {
  return (
    <div className="mb-8 flex items-center space-x-4">
      {userData.profilePicture && (
        <img
          src={`http://localhost:5000${userData.profilePicture}?t=${Date.now()}`}
          alt="Profile"
          className="w-12 h-12 rounded-full object-cover"
          onError={(e) =>
            console.error("[ProfileHeader] Image load error:", userData.profilePicture, e)
          }
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
        {availability.startTime &&
          availability.endTime &&
          availability.days?.length > 0 && (
            <p className="text-blue-600 mt-1">
              Availability: {availability.days.join(", ")},{" "}
              {availability.startTime} - {availability.endTime}
            </p>
          )}
      </div>
    </div>
  );
}