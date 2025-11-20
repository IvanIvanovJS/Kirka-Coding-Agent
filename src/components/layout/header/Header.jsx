import { useState } from 'react';
import styles from './Header.module.css';
import GhostIcon from '../../UI/ghostIcon/GhostIcon'
import { Link } from 'react-router';


const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);


    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        // Header Container with Nav as Sibling
        <div className={styles.headerWrapper}>
            <header className={styles.header}>
                {/* Logo Section */}
                <div className={styles.logo}>
                    <GhostIcon />
                    <span className={styles.siteName}>Kirka</span>
                </div>

                {/* Desktop Navigation */}
                <nav className={styles.navDesktop}>
                    <Link to="/" className={styles.navLink} >Home</Link>
                    <Link to="/templates" className={styles.navLink} >Templates</Link>
                    <Link to="/my-templates" className={styles.navLink}>My Templates</Link>
                    <Link to="/login" className={styles.navLink}>Login</Link>
                </nav>

                {/* Mobile Menu Icon */}
                <div className={`${styles.menuIcon} ${isMenuOpen ? styles.menuIconOpen : ''}`} onClick={toggleMenu}>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </header>

            {/* Mobile Navigation as Sibling */}
            <nav className={`${styles.navMobile} ${isMenuOpen ? styles.navMobileOpen : ''}`}>
                <Link to="/" className={styles.navLink}>Home</Link>
                <Link to="/templates" className={styles.navLink}>Templates</Link>
                <Link to="/my-templates" className={styles.navLink}>My Templates</Link>
                <Link to="/login" className={styles.navLink}>Login</Link>
            </nav>
        </div>
    );
};

export default Header;
