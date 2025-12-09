import { AlertCircle } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { UserContext } from '../../../contexts/UserContext';
import useFetch from '../../../hooks/useFetch';
import useForm from '../../../hooks/useForm';
import styles from './Register.module.css';

const initialValues = {
	email: '',
	password: '',
	confirmPassword: '',
};

export default function Register() {
	const [userData, setUserData] = useState(null);
	const [clientErrors, setClientErrors] = useState(null);
	const { setAuthenticatedUser } = useContext(UserContext);
	const navigate = useNavigate();

	const { input, formAction, setValues, isSubmitting, setIsSubmitting } =
		useForm(registerHandler, initialValues);

	const {
		data: user,
		error: serverError,
		setError,
	} = useFetch(
		'http://localhost:3030/users/register',
		{},
		'POST',
		{},
		userData,
	);

	function registerHandler(values) {
		const { email, password, confirmPassword } = values;
		const clientErros = {};
		if (!email) {
			clientErros.email = 'Email is required!';
		}
		if (!password) {
			clientErros.password = 'Password is required!';
		}

		if (password !== confirmPassword) {
			clientErros.confirmPassword = 'Password does not match!';
		}

		if (Object.keys(clientErros).length > 0) {
			setClientErrors(clientErros);
			setError(null);
			throw new Error('Input validation error!');
		}

		if (serverError) {
			setError(null);
			setUserData({ ...values, ct: new Date() });
			return;
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
		<div className={styles.registerContainer}>
			<form className={styles.registerForm} action={formAction}>
				<h2 className={styles.formTitle}>Register</h2>

				<div className={styles.inputGroup}>
					<label htmlFor="email" className={styles.label}>
						Email
					</label>
					<input
						type="email"
						id="email"
						{...input('email')}
						className={styles.input}
						placeholder="Enter your email"
					/>
					{clientErrors?.email && (
						<p className={styles.errorMessage}>
							<AlertCircle size={14} />
							{clientErrors.email}
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

				<div className={styles.inputGroup}>
					<label htmlFor="confirmPassword" className={styles.label}>
						Confirm Password
					</label>
					<input
						type="password"
						id="confirmPassword"
						{...input('confirmPassword')}
						className={styles.input}
						placeholder="Confirm your password"
					/>
					{clientErrors?.confirmPassword && (
						<p className={styles.errorMessage}>
							<AlertCircle size={14} />
							{clientErrors.confirmPassword}
						</p>
					)}
				</div>
				{serverError && (
					<p className={styles.errorMessage}>
						<AlertCircle size={14} />
						{serverError}
					</p>
				)}
				<button
					type="submit"
					className={styles.submitBtn}
					disabled={isSubmitting}
				>
					{isSubmitting ? 'Please wait...' : 'Register'}
				</button>

				<p className={styles.formLink}>
					Already have an account?{' '}
					<Link to="/auth/login" className={styles.link}>
						Login
					</Link>
				</p>
			</form>
		</div>
	);
}
