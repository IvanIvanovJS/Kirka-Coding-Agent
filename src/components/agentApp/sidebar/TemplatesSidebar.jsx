import { Link } from 'react-router';
import GhostIcon from '../../UI/ghostIcon/GhostIcon';
import styles from './TemplatesSidebar.module.css';
import TemplateItem from './templateItem/TemplateItem';
import { useAgentApp, useUser } from '../../../contexts';

export default function TemplatesSidebar() {
	const {
		isSidebarVisible,
		toggleSidebar,
		templates,
		isLoading,
		serverError,
		templateViewMode,
		handleSetTemplateViewMode,
		myTemplates,
		isLoadingMyTemplates,
		myTemplatesError,
	} = useAgentApp();
	const { isAuthenticated } = useUser();
	const isHistoryOn = window.history.length > 1;

	const currentTemplates =
		templateViewMode === 'templates' ? templates : myTemplates;
	const currentIsLoading =
		templateViewMode === 'templates' ? isLoading : isLoadingMyTemplates;

	if (!isSidebarVisible) {
		return (
			<div className={styles.sidebarToggleCollapsed}>
				<button
					type="button"
					className={styles.toggleButtonCollapsed}
					onClick={toggleSidebar}
					aria-label="Show sidebar"
				>
					▶
				</button>
			</div>
		);
	}
	return (
		<div className={styles.sidebar}>
			<div className={styles.sidebarHeader}>
				<Link to={isHistoryOn ? -1 : '/'} className={styles.backButton}>
					← Back
				</Link>
			</div>

			<div className={styles.modeToggle}>
				<button
					className={`${styles.modeButton} ${templateViewMode === 'templates' ? styles.active : ''}`}
					type="button"
					aria-label="View all templates"
					onClick={() => handleSetTemplateViewMode('templates')}
				>
					<span>Templates</span>
				</button>
				<button
					type="button"
					className={`${styles.modeButton} ${templateViewMode === 'myTemplates' ? styles.active : ''}`}
					aria-label="View my templates"
					onClick={() => handleSetTemplateViewMode('myTemplates')}
				>
					<span>My Templates</span>
				</button>
			</div>

			<div className={styles.templateList}>
				{currentIsLoading && (
					<p className={styles.emptyState}>Loading templates...</p>
				)}
				{!currentIsLoading && currentTemplates?.length === 0 && (
					<p className={styles.emptyState}>
						{myTemplates
							? 'No personal projects yet? Choose from templates to start.'
							: 'No templates found.'}
					</p>
				)}
				{!currentIsLoading &&
					currentTemplates?.length > 0 &&
					currentTemplates.map((template) => (
						<TemplateItem key={template._id} template={template} />
					))}
				{serverError && (
					<p className={styles.error}>
						Unable to fetch templates. Please try again later.
					</p>
				)}

				{myTemplatesError && templateViewMode !== 'templates' && (
					<p className={styles.emptyState}>
						No personal projects yet? Choose from templates to start.
					</p>
				)}
				{!isAuthenticated && templateViewMode !== 'templates' && (
					<p className={styles.emptyState}>
						No templates available. Please
						<Link to={'/auth/login'}> login</Link>.
					</p>
				)}
			</div>

			<div className={styles.sidebarFooter}>
				<Link to={'/'} className={styles.logoContainer}>
					<GhostIcon size={48} className={styles.ghostIcon} />
					<span className={styles.siteName}>Kirka</span>
				</Link>
				<button
					type="button"
					className={styles.toggleButton}
					aria-label="Hide sidebar"
					onClick={toggleSidebar}
				>
					◀
				</button>
			</div>
		</div>
	);
}
