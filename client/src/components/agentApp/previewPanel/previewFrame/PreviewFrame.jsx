import { EmptyStateIcon } from '../../../../assets/icons';
import { useAgentApp } from '../../../../contexts';
import wrapperIframeData from '../../../../utils/wrapperIframeData';
import styles from './PreviewFrame.module.css';

export default function PreviewFrame() {
	const { currentTemplate, previewMode } = useAgentApp();

	if (!currentTemplate) {
		return (
			<div className={styles.frameContainer}>
				<div className={styles.emptyState}>
					<EmptyStateIcon />
					<h3>No Template Selected</h3>
					<p>
						Select a template from the sidebar or create one through chat to see
						a preview
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.frameContainer}>
			<div
				className={`${styles.frameWrapper} ${previewMode === 'mobile' ? styles.mobileMode : styles.desktopMode}`}
			>
				<iframe
					className={styles.iframe}
					title={currentTemplate.name}
					sandbox="allow-scripts allow-same-origin"
					srcDoc={wrapperIframeData(currentTemplate.full_html_template)}
				/>
			</div>
		</div>
	);
}
