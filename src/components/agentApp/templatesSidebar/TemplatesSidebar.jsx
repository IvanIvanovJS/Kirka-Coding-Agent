import { Link } from 'react-router';
import GhostIcon from '../../UI/ghostIcon/GhostIcon';
import styles from './TemplatesSidebar.module.css';

export default function TemplatesSidebar() {
	return (
		<div className={styles.sidebar}>
			<div className={styles.sidebarHeader}>
				<Link to={'/'} className={styles.logoContainer}>
					<GhostIcon size={40} className={styles.ghostIcon} />
					<h3 className={styles.title}>Templates</h3>
				</Link>
				<button
					type="button"
					className={styles.toggleButton}
					aria-label="Hide sidebar"
				>
					◀
				</button>
			</div>

			<div className={styles.templateList}>
				<p className={styles.emptyState}>Loading templates...</p>
			</div>
		</div>
	);
}
