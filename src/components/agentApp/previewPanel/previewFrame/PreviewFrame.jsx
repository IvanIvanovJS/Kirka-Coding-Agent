import { useAgentApp } from '../../../../contexts';
import wrapperIframeData from '../../../../utils/wrapperIframeData';
import styles from './PreviewFrame.module.css';

export default function PreviewFrame() {
	const { currentTemplate, previewMode } = useAgentApp();

	const showFullHtml =
		currentTemplate && Object.hasOwn(currentTemplate, 'full_html_template');

	if (!currentTemplate) {
		return (
			<div className={styles.frameContainer}>
				<div className={styles.emptyState}>
					<svg
						width="64"
						height="64"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
					>
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
						<line x1="9" y1="9" x2="15" y2="15" />
						<line x1="15" y1="9" x2="9" y2="15" />
					</svg>
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
					srcDoc={
						showFullHtml
							? wrapperIframeData(currentTemplate.full_html_template)
							: currentTemplate
					}
				/>
			</div>
		</div>
	);
}
