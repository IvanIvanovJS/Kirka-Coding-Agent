import { useContext, useEffect } from 'react';
import { UserContext } from '../../../contexts/UserContext';
import { useNavigate } from 'react-router';

export default function Logout() {
	const navigate = useNavigate();
	const { setAuthenticatedUser, user } = useContext(UserContext);

	useEffect(() => {
		const logout = async () => {
			try {
				if (user?.accessToken) {
					await fetch('http://localhost:3030/users/logout', {
						method: 'GET',
						headers: {
							'X-Authorization': user.accessToken,
						},
					});
				}
			} catch (error) {
				console.error('Logout error:', error);
			} finally {
				setAuthenticatedUser(null);
				navigate('/');
			}
		};

		logout();
	}, [navigate, setAuthenticatedUser, user]);

	return null;
}
