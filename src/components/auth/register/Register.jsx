import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import useFetch from "../../../hooks/useFetch";
import useForm from "../../../hooks/useForm";
import styles from "./Register.module.css";

const initialValues = {
	email: "",
	password: "",
	confirmPassword: "",
};

export default function Register({ setAuthenticatedUser }) {
	const [userData, setUserData] = useState(null);
	const [clientErrors, setClientErrors] = useState(null);
	const navigate = useNavigate();

	const { input, formAction, setValues } = useForm(
		registerHandler,
		initialValues,
	);
	const {
		data: user,
		isLoading,
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
		if (user.accessToken) {
			setValues(initialValues);
			setAuthenticatedUser(user);
			navigate("/");
		}
	}, [setAuthenticatedUser, navigate, user, setValues]);

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
						{...input("email")}
						className={styles.input}
						placeholder="Enter your email"
					/>
					{clientErrors && <p>{clientErrors.email}</p>}
				</div>

				<div className={styles.inputGroup}>
					<label htmlFor="password" className={styles.label}>
						Password
					</label>
					<input
						type="password"
						id="password"
						{...input("password")}
						className={styles.input}
						placeholder="Enter your password"
					/>
					{clientErrors && <p>{clientErrors.password}</p>}
				</div>

				<div className={styles.inputGroup}>
					<label htmlFor="confirmPassword" className={styles.label}>
						Confirm Password
					</label>
					<input
						type="password"
						id="confirmPassword"
						{...input("confirmPassword")}
						className={styles.input}
						placeholder="Confirm your password"
					/>
					{clientErrors && <p>{clientErrors.confirmPassword}</p>}
				</div>
				{serverError && <p>{serverError}</p>}
				<button type="submit" className={styles.submitBtn} disabled={isLoading}>
					{isLoading ? "Please wait..." : "Register"}
				</button>

				<p className={styles.formLink}>
					Already have an account?{" "}
					<Link to="/auth/login" className={styles.link}>
						Login
					</Link>
				</p>
			</form>
		</div>
	);
}
