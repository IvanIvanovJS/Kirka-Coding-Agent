import { Link } from 'react-router'
import styles from './Login.module.css'

export default function Login() {
    return (
        <div className={styles.loginContainer}>
            <form className={styles.loginForm}>
                <h2 className={styles.formTitle}>Login</h2>

                <div className={styles.inputGroup}>
                    <label htmlFor="email" className={styles.label}>Email</label>
                    <input
                        type="email"
                        id="email"
                        className={styles.input}
                        name='email'
                        placeholder="Enter your email"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="password" className={styles.label}>Password</label>
                    <input
                        type="password"
                        id="password"
                        name='password'
                        className={styles.input}
                        placeholder="Enter your password"
                    />
                </div>

                <button type="submit" className={styles.submitBtn}>
                    Login
                </button>

                <p className={styles.formLink}>
                    Don't have an account? <Link to="/auth/register" className={styles.link}>Register</Link>
                </p>
            </form>
        </div>
    )
}