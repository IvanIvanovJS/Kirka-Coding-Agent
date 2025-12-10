import { useContext, useState } from "react";
import { Link } from "react-router";
import { UserContext } from "../../../contexts/UserContext";
import GhostIcon from "../../UI/ghostIcon/GhostIcon";
import styles from "./Header.module.css";

const Header = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
	};

	const { isAuthenticated } = useContext(UserContext);
	return (
		<div className={styles.headerWrapper}>
			<header className={styles.header}>
				{/* Logo Section */}
				<Link to={"/"} className={styles.logo}>
					<GhostIcon />
					<span className={styles.siteName}>Kirka</span>
				</Link>

				{/* Desktop Navigation */}
				<nav className={styles.navDesktop}>
					<Link to="/" className={styles.navLink}>
						Home
					</Link>
					<Link to="/templates" className={styles.navLink}>
						Templates
					</Link>
					{isAuthenticated ? (
						<>
							<Link to="/my-templates" className={styles.navLink}>
								My Templates
							</Link>
							<Link to="/auth/logout" className={styles.navLink}>
								Logout
							</Link>
						</>
					) : (
						<Link to="/auth/login" className={styles.navLink}>
							Login
						</Link>
					)}
				</nav>

				{/* Mobile Menu Icon */}
				<div
					className={`${styles.menuIcon} ${isMenuOpen ? styles.menuIconOpen : ""}`}
					onClick={toggleMenu}
				>
					<span></span>
					<span></span>
					<span></span>
				</div>
			</header>

			{/* Mobile Navigation */}
			<nav
				className={`${styles.navMobile} ${isMenuOpen ? styles.navMobileOpen : ""}`}
			>
				<Link to="/" onClick={toggleMenu} className={styles.navLink}>
					Home
				</Link>
				<Link to="/templates" onClick={toggleMenu} className={styles.navLink}>
					Templates
				</Link>
				{isAuthenticated ? (
					<>
						<Link
							to="/my-templates"
							onClick={toggleMenu}
							className={styles.navLink}
						>
							My Templates
						</Link>
						<Link
							to="/auth/logout"
							onClick={toggleMenu}
							className={styles.navLink}
						>
							Logout
						</Link>
					</>
				) : (
					<Link
						to="/auth/login"
						onClick={toggleMenu}
						className={styles.navLink}
					>
						Login
					</Link>
				)}
			</nav>
		</div>
	);
};

export default Header;
