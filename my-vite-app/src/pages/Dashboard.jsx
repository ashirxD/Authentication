// import { useNavigate } from "react-router-dom";

// export default function Dashboard() {
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     navigate("/signin");
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
//         <h2 className="text-3xl font-extrabold text-gray-900 text-center">
//           Welcome to Your Dashboard
//         </h2>
//         <p className="mt-2 text-center text-sm text-gray-600">
//           You have successfully logged in!
//         </p>
//         <div className="mt-6">
//           <button
//             onClick={handleLogout}
//             className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
//           >
//             Log Out
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }