import { Link, useNavigate } from 'react-router';
import { useContext, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { UserContext } from '../../../contexts/UserContext';
import useFetch from '../../../hooks/useFetch';
import useForm from '../../../hooks/useForm';
import styles from './Login.module.css';

const initialValues = {
	email: '',
	password: '',
};

export default function Login() {
	const [userData, setUserData] = useState(null);
	const [clientErrors, setClientErrors] = useState(null);
	const { setAuthenticatedUser } = useContext(UserContext);

	const navigate = useNavigate();

	const { input, formAction, setValues, isSubmitting, setIsSubmitting } =
		useForm(loginHandler, initialValues);

	const {
		data: user,
		error: serverError,
		setError,
	} = useFetch('http://localhost:3030/users/login', {}, 'POST', {}, userData);

	function loginHandler(values) {
		const { email, password } = values;
		const clientErros = {};
		if (!email) {
			clientErros.email = 'Email is required!';
		}
		if (!password) {
			clientErros.password = 'Password is required!';
		}

		if (Object.keys(clientErros).length > 0) {
			setClientErrors(clientErros);
			setError(null);
			throw new Error('Input validation error!');
		}

		setClientErrors(null);
		setUserData({ email, password });
	}

	useEffect(() => {
		if (serverError) {
			setIsSubmitting(false);
		}
	}, [serverError, setIsSubmitting]);

	useEffect(() => {
		if (user.accessToken) {
			setValues(initialValues);
			setAuthenticatedUser(user);
			setIsSubmitting(false);
			navigate('/');
		}
	}, [setAuthenticatedUser, navigate, user, setValues, setIsSubmitting]);

	return (
		<div className={styles.loginContainer}>
			<form className={styles.loginForm} action={formAction}>
				<h2 className={styles.formTitle}>Login</h2>

				<div className={styles.inputGroup}>
					<label htmlFor="email" className={styles.label}>
						Email
					</label>
					<input
						type="email"
						id="email"
						className={styles.input}
						{...input('email')}
						placeholder="Enter your email"
					/>
					{clientErrors?.email && (
						<p className={styles.errorMessage}>
							<AlertCircle size={14} />
							{clientErrors.password}
						</p>
					)}
				</div>

				<div className={styles.inputGroup}>
					<label htmlFor="password" className={styles.label}>
						Password
					</label>
					<input
						type="password"
						id="password"
						{...input('password')}
						className={styles.input}
						placeholder="Enter your password"
					/>
					{clientErrors?.password && (
						<p className={styles.errorMessage}>
							<AlertCircle size={14} />
							{clientErrors.password}
						</p>
					)}
				</div>
				{serverError && (
					<p className={styles.errorMessage}>
						<AlertCircle size={14} />
						{serverError}
					</p>
				)}
				<button type="submit" className={styles.submitBtn}>
					{isSubmitting ? 'Please wait...' : 'Login'}
				</button>

				<p className={styles.formLink}>
					Don't have an account?{' '}
					<Link to="/auth/register" className={styles.link}>
						Register
					</Link>
				</p>
			</form>
		</div>
	);
}
