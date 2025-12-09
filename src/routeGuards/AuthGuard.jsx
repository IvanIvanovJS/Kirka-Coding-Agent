import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { Navigate, useLocation } from 'react-router';

export default function AuthGuard({ children }) {
	const { isAuthenticated } = useContext(UserContext);
	const location = useLocation();

	if (!isAuthenticated) {
		return (
			<Navigate
				to={`/auth/login?redirectTo=${encodeURIComponent(location.pathname + location.search)}`}
				replace
			/>
		);
	}
	return children;
}
