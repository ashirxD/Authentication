export default function PatientsList({ uniquePatients, error }) {
  return (
    <div>
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">
        My Patients
      </h3>
      {error && (
        <p className="text-red-600 bg-red-100 border border-red-400 rounded p-3 mb-4 animate-fade-in">
          {error}
        </p>
      )}
      {uniquePatients.length === 0 ? (
        <p className="text-gray-600">No patients with upcoming appointments.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniquePatients.map((patient) => (
            <div
              key={patient._id}
              className="flex border border-gray-300 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="w-24 h-24 mr-5">
                {patient.profilePicture ? (
                  <img
                    src={`http://localhost:5000${patient.profilePicture}?t=${Date.now()}`}
                    alt={`${patient.name}'s profile`}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      e.target.style.display = 'none'; // Hide image if it fails to load
                      console.error("[PatientsList] Image load error:", patient.profilePicture, e);
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-full"></div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-800">{patient.name}</h4>
                <p className="text-sm text-gray-600">Email: {patient.email}</p>
                <p className="text-sm text-gray-600">Phone: {patient.phoneNumber}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}