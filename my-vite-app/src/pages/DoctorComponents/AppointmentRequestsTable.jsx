export default function AppointmentRequestsTable({
  appointmentRequests,
  error,
  success,
  handleAcceptRequest,
  handleRejectRequest,
}) {
  return (
    <div>
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">
        Appointment Requests
      </h3>
      {success && (
        <p className="text-green-600 bg-green-100 border border-green-400 rounded p-3 mb-4 animate-fade-in">
          {success}
        </p>
      )}
      {error && (
        <p className="text-red-600 bg-red-100 border border-red-400 rounded p-3 mb-4 animate-fade-in">
          {error}
        </p>
      )}
      {appointmentRequests.length === 0 ? (
        <p className="text-gray-600">No pending appointment requests.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Patient</th>
                <th className="py-3 px-6 text-left">Date</th>
                <th className="py-3 px-6 text-left">Time</th>
                <th className="py-3 px-6 text-left">Reason</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {appointmentRequests.map((request) => (
                <tr
                  key={request._id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-3 px-6">
                    {request.patient?.name || "Unknown Patient"}
                  </td>
                  <td className="py-3 px-6">
                    {request.date
                      ? new Date(request.date).toISOString().split("T")[0]
                      : "N/A"}
                  </td>
                  <td className="py-3 px-6">{request.time || "N/A"}</td>
                  <td className="py-3 px-6">{request.reason || "N/A"}</td>
                  <td className="py-3 px-6 text-center space-x-2">
                    <button
                      onClick={() => handleAcceptRequest(request._id)}
                      className="text-green-600 hover:text-green-800 px-3 py-1 rounded bg-green-100 hover:bg-green-200 transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request._id)}
                      className="text-red-600 hover:text-red-800 px-3 py-1 rounded bg-red-100 hover:bg-red-200 transition"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}