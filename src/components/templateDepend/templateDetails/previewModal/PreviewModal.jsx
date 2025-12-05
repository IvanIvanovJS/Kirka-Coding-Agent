import { useNavigate } from 'react-router';
import { useAgentApp } from '../../../../contexts';
import exportAsHtml from '../../../../utils/exportAsHtml';
import wrapperIframeData from '../../../../utils/wrapperIframeData';
import styles from './PreviewModal.module.css';

export default function PreveiwModal({ isLoading, content, setPreviewFalse }) {
	const { setCurrentTemplate } = useAgentApp();
	const navigate = useNavigate();
	return (
		<>
			{/** biome-ignore lint/a11y/useSemanticElements: stfu*/}
			<div
				role="button"
				tabIndex={0}
				className={styles.backdrop}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						setPreviewFalse();
					}
				}}
				onClick={() => setPreviewFalse()}
			/>
			{!isLoading && (
				<div className={styles.templatePreview}>
					<div className={styles.modalHeader}>
						<div className={styles.modalActions}>
							<button
								type="button"
								className={styles.modalButton}
								onClick={() => {
									exportAsHtml(content.full_html_template, content.name);
								}}
							>
								Download
							</button>
							<button
								type="button"
								className={styles.modalButton}
								onClick={() => {
									setCurrentTemplate(content);
									navigate('/agent-app');
									setPreviewFalse();
								}}
							>
								Add to App
							</button>
						</div>
						<button
							type="button"
							className={styles.closeButton}
							onClick={() => setPreviewFalse()}
						>
							<span>🗙</span>
						</button>
					</div>
					<div className={styles.iframeContainer}>
						<iframe
							title={content.name}
							className={styles.iframe}
							sandbox="allow-scripts allow-same-origin"
							srcDoc={wrapperIframeData(
								`${content.full_html_template}`,
								content.bodyClass,
							)}
						/>
					</div>
				</div>
			)}
		</>
	);
}
