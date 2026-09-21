import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ role, children }) {
	const user = JSON.parse(localStorage.getItem("user") || "null");
	if (!user) return <Navigate to="/login" replace />;
	if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />;
	return children;
}
