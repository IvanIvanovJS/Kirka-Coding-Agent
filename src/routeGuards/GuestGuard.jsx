import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { Navigate } from 'react-router';

export default function GuestGuard({ children }) {
	const { isAuthenticated } = useContext(UserContext);

	if (isAuthenticated) {
		return <Navigate to="/" replace />;
	}

	return children;
}
