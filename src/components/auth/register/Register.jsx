import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import useFetch from "../../../hooks/useFetch";
import useForm from "../../../hooks/useForm";
import styles from "./Register.module.css";
import UserContext from "../../../contexts/UserContext";

const initialValues = {
	email: "",
	password: "",
	confirmPassword: "",
};

export default function Register({ setAuthenticatedUser }) {
	const [userData, setUserData] = useState(null);
	const [errors, setErrors] = useState(null);
	const navigate = useNavigate();

	const { input, formAction } = useForm(registerHandler, initialValues);
	const {
		data: user,
		isLoading,
		error,
	} = useFetch(
		"http://localhost:3030/users/register",
		{},
		"POST",
		{},
		userData,
	);

	function registerHandler(values) {
		const { email, password, confirmPassword } = values;

		if (!email) {
			const errorMessage = "Email is required!";
			setErrors(errorMessage);
			throw new Error(errorMessage);
		}
		if (!password) {
			const errorMessage = "Password is required!";
			setErrors(errorMessage);
			throw new Error(errorMessage);
		}

		if (password !== confirmPassword) {
			const errorMessage = "Passwords does not match!";
			setErrors(errorMessage);
			throw new Error(errorMessage);
		}

		setUserData({ email, password });
	}

	useEffect(() => {
		if (error) {
			setErrors(error);
		}
	}, [error]);

	useEffect(() => {
		if (errors) {
			return alert(errors);
		}
	}, [errors]);

	useEffect(() => {
		if (user.accessToken) {
			setAuthenticatedUser(user);
			navigate("/");
		}
	}, [setAuthenticatedUser, navigate, user]);

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
				</div>

				<button type="submit" className={styles.submitBtn}>
					Register
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
