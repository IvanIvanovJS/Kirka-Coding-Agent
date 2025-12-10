import styles from './Hero.module.css';
import GhostIcon from '../UI/ghostIcon/GhostIcon';
import { Link } from 'react-router';

export default function Hero() {
	const scrollToFeatures = () => {
		const featuresSection = document.getElementById('features');
		if (featuresSection) {
			featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	return (
		<div className={styles.heroContainer}>
			<div className={styles.heroContent}>
				<div className={styles.heroText}>
					<h1 className={styles.heroTitle}>
						Build Your Dream Website with Kirka
					</h1>

					<p className={styles.heroSubtitle}>
						Discover powerful AI-driven templates and tools to build stunning
						websites effortlessly. Start experiencing your perfect design today.
					</p>

					<div className={styles.ctaButtons}>
						<Link to={'/agent-app'} type="button" className={styles.primaryBtn}>
							Launch App
						</Link>

						<button
							type="button"
							className={styles.secondaryBtn}
							onClick={scrollToFeatures}
						>
							Learn More
						</button>
					</div>
				</div>

				<div className={styles.heroVisual}>
					<GhostIcon className={styles.ghostIcon} size={300} />
				</div>
			</div>
		</div>
	);
}
