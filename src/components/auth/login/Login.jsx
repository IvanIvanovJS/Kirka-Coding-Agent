import { useEffect, useState } from "react";
import { Link } from "react-router";
import useForm from "../../../hooks/useForm";
import useFetch from "../../../hooks/useFetch";
import styles from "./Login.module.css";

export default function Login() {
	const [userData, setUserData] = useState(null);
	const [clientErrors, setClientErrors] = useState(null);

	const navigate = useNavigate();

	const { input, formAction, setValues, isSubmitting, setIsSubmitting } =
		useForm(registerHandler, initialValues);

	const {
		data: user,
		error: serverError,
		setError,
	} = useFetch(
		"http://localhost:3030/users/register",
		{},
		"POST",
		{},
		userData,
	);

	function registerHandler(values) {
		const { email, password, confirmPassword } = values;
		const clientErros = {};
		if (!email) {
			clientErros.email = "Email is required!";
		}
		if (!password) {
			clientErros.password = "Password is required!";
		}

		if (password !== confirmPassword) {
			clientErros.confirmPassword = "Password does not match!";
		}

		if (Object.keys(clientErros).length > 0) {
			setClientErrors(clientErros);
			setError(null);
			throw new Error("Input validation error!");
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
			navigate("/");
		}
	}, [setAuthenticatedUser, navigate, user, setValues, setIsSubmitting]);

	return (
		<div className={styles.loginContainer}>
			<form className={styles.loginForm}>
				<h2 className={styles.formTitle}>Login</h2>

				<div className={styles.inputGroup}>
					<label htmlFor="email" className={styles.label}>
						Email
					</label>
					<input
						type="email"
						id="email"
						className={styles.input}
						name="email"
						placeholder="Enter your email"
					/>
				</div>

				<div className={styles.inputGroup}>
					<label htmlFor="password" className={styles.label}>
						Password
					</label>
					<input
						type="password"
						id="password"
						name="password"
						className={styles.input}
						placeholder="Enter your password"
					/>
				</div>

				<button type="submit" className={styles.submitBtn}>
					Login
				</button>

				<p className={styles.formLink}>
					Don't have an account?{" "}
					<Link to="/auth/register" className={styles.link}>
						Register
					</Link>
				</p>
			</form>
		</div>
	);
}
