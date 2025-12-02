import { useContext, useEffect } from 'react';
import { UserContext } from '../../../contexts/UserContext';
import useFetch from '../../../hooks/useFetch';
import { useNavigate } from 'react-router';

export default function Logout() {
	const navigate = useNavigate();

	const { setAuthenticatedUser, user } = useContext(UserContext);

	const { error, isLoading } = useFetch(
		'http://localhost:3030/users/logout',
		{},
		'GET',
		{
			'X-Authorization': user.accessToken,
		},
	);

	useEffect(() => {
		if (isLoading) {
			setAuthenticatedUser(null);
			navigate('/');
		}
	}, [navigate, setAuthenticatedUser, isLoading]);

	useEffect(() => {
		if (error) {
			console.error('Server error: ', error.message);
		}
	}, [error]);

	return null;
}
