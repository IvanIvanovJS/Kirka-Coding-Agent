import { Link } from 'react-router';
import GhostIcon from '../../UI/ghostIcon/GhostIcon';
import styles from './TemplatesSidebar.module.css';
import TemplateItem from './templateItem/TemplateItem';


export default function TemplatesSidebar() {
	return (
		<div className={styles.sidebar}>
			<div className={styles.sidebarHeader}>
				<div className={styles.logoContainer}>
					<Link to={'/'}>
						<GhostIcon size={48} className={styles.ghostIcon} />
					</Link>
					<h3 className={styles.title}>Templates</h3>
				</div>
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
				<TemplateItem />
			</div>
		</div>
	);
}
