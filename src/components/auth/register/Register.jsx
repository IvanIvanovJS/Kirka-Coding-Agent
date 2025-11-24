import { Link } from 'react-router';
import styles from './Register.module.css';

export default function Register() {
    return (
        <div className={styles.registerContainer}>
            <form className={styles.registerForm}>
                <h2 className={styles.formTitle}>Register</h2>

                <div className={styles.inputGroup}>
                    <label htmlFor="email" className={styles.label}>Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        className={styles.input}
                        placeholder="Enter your email"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="password" className={styles.label}>Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        className={styles.input}
                        placeholder="Enter your password"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        className={styles.input}
                        placeholder="Confirm your password"
                    />
                </div>

                <button type="submit" className={styles.submitBtn}>
                    Register
                </button>

                <p className={styles.formLink}>
                    Already have an account? <Link to="/auth/login" className={styles.link} >Login</Link>
                </p>
            </form>
        </div>
    )
}