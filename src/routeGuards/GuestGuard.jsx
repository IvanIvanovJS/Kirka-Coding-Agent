import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { Navigate, useSearchParams } from 'react-router';

export default function GuestGuard({ children }) {
	const { isAuthenticated } = useContext(UserContext);
	const [searchParams] = useSearchParams();
	const redirectTo = searchParams.get('redirectTo');

	if (isAuthenticated) {
		if (redirectTo === '/auth/logout') {
			return <Navigate to={'/'} />;
		}
		return <Navigate to={redirectTo || '/'} replace />;
	}

	return children;
}
