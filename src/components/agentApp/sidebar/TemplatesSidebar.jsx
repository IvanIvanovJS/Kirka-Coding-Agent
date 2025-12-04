import { Link } from 'react-router';
import GhostIcon from '../../UI/ghostIcon/GhostIcon';
import styles from './TemplatesSidebar.module.css';
import TemplateItem from './templateItem/TemplateItem';

export default function TemplatesSidebar({ templates, isLoading, error }) {
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
				{isLoading && <p className={styles.emptyState}>Loading templates...</p>}
				{templates.length === 0 && (
					<p className={styles.emptyState}>No templates found.</p>
				)}
				{!isLoading &&
					templates.length > 0 &&
					templates.map((template) => (
						<TemplateItem key={template._id} template={template} />
					))}
				{error && (
					<p className={styles.error}>
						Unable to fetch templates. Please try again later.
					</p>
				)}
			</div>
		</div>
	);
}
