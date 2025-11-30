import { useState } from "react";
import { Link } from "react-router";
import useFetch from "../../../hooks/useFetch";
import useForm from "../../../hooks/useForm";
import styles from "./Register.module.css";

const initialValues = {
	email: "",
	password: "",
	confirmPassword: "",
};

export default function Register() {
	const [user, setUser] = useState(null);

	const { values, onChangeHandler, formAction } = useForm(
		registerHandler,
		initialValues,
	);
	const {
		data: userData,
		isLoading,
		error,
	} = useFetch("http://localhost:3030/users/register", {}, "POST", {}, user);

	function registerHandler(values) {
		const { email, password, confirmPassword } = values;

		if (!email) {
			throw new Error("Email is required!");
		}
		if (!password) {
			throw new Error("Password is required!");
		}

		if (password !== confirmPassword) {
			throw new Error("Passwords does not match!");
		}

		setUser({ email, password });
	}
	console.log(userData);
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
						name="email"
						value={values.email}
						onChange={onChangeHandler}
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
						name="password"
						value={values.password}
						onChange={onChangeHandler}
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
						name="confirmPassword"
						value={values.confirmPassword}
						onChange={onChangeHandler}
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
