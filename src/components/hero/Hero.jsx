import styles from './Hero.module.css';
import GhostIcon from '../UI/ghostIcon/GhostIcon';

export default function Hero() {
    return (

        <div className={styles.heroContainer}>
            <div className={styles.heroContent}>
                <div className={styles.heroText}>
                    <h1 className={styles.heroTitle}>Build Your Dream Website with Kirka</h1>

                    <p className={styles.heroSubtitle}>
                        Discover powerful AI-driven templates and tools to build stunning websites effortlessly.
                        Start experiencing your perfect design today.
                    </p>

                    <div className={styles.ctaButtons}>
                        <button className={styles.primaryBtn}>Launch App</button>

                        <button className={styles.secondaryBtn}>Learn More</button>
                    </div>
                </div>

                <div className={styles.heroVisual}>
                    <GhostIcon className={styles.ghostIcon} size={300} />
                </div>
            </div>
        </div>

    );
};

