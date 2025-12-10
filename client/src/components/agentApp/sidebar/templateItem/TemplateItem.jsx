import { useState } from 'react';
import PreviewModalPortal from '../../../../portals/PreviewModalPortal';
import PreveiwModal from '../../../templateDepend/templateDetails/previewModal/PreviewModal';
import styles from './TemplateItem.module.css';
import { useAgentApp } from '../../../../contexts';

export default function TemplateItem({ template }) {
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const {setCurrentTemplate} = useAgentApp();
	const setPreviewFalse = () => {
		setIsPreviewOpen(false);
	};

	return (
		<div className={styles.templateItem}>
			<div className={styles.templateInfo}>
				<h4 className={styles.templateName}>{template.name}</h4>
				<span className={styles.templateCategory}>{template.category}</span>
			</div>
			<div className={styles.templateActions}>
				<button
					type="button"
					onClick={() => {
						setIsPreviewOpen(true);
					}}
					className={`${styles.actionButton} ${styles.previewButton}`}
				>
					Preview
				</button>
				<button
					type="button"
					className={`${styles.actionButton} ${styles.addButton}`}
					onClick={() => setCurrentTemplate(template)}
				>
					Add to Chat
				</button>
			</div>
			{isPreviewOpen && (
				<PreviewModalPortal>
					<PreveiwModal
						isLoading={false}
						content={template}
						setPreviewFalse={setPreviewFalse}
					/>
				</PreviewModalPortal>
			)}
		</div>
	);
}
