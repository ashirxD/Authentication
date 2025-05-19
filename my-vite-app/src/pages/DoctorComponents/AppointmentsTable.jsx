export default function AppointmentsTable({ appointments, error }) {
  return (
    <div>
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">
        Upcoming Appointments
      </h3>
      {error && (
        <p className="text-red-600 bg-red-100 border border-red-400 rounded p-3 mb-4 animate-fade-in">
          {error}
        </p>
      )}
      {appointments.length === 0 ? (
        <p className="text-gray-600">No upcoming appointments.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-4 px-6 text-left">Patient</th>
                <th className="py-4 px-6 text-left">Date</th>
                <th className="py-4 px-6 text-left">Time</th>
                <th className="py-4 px-6 text-left">Reason</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {appointments.map((appointment) => (
                <tr
                  key={appointment._id}
                  className="border-b border-gray-200 even:bg-gray-50 hover:bg-gray-100"
                >
                  <td className="py-4 px-6 font-semibold">
                    {appointment.patient?.name || "Unknown Patient"}
                  </td>
                  <td className="py-4 px-6">
                    {appointment.date
                      ? new Date(appointment.date).toISOString().split("T")[0]
                      : "N/A"}
                  </td>
                  <td className="py-4 px-6 text-teal-600">
                    {appointment.time || "N/A"}
                  </td>
                  <td className="py-4 px-6">{appointment.reason || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}