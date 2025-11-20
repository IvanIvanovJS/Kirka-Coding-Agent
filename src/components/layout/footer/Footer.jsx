import { Link } from 'react-router';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerContent}>
                <p className={styles.copyright}>© 2025 Kirka Coding Agent</p>

                <p className={styles.website}>Build by{' '} <Link to={'https://webmorphism.com'}>{" "}Webmorphism</Link></p>
            </div>
        </footer>
    );
};

