import PreviewFrame from './previewFrame/PreviewFrame';
import styles from './PreviewPanel.module.css';
import PreviewToolbar from './previewToolbar/PreviewToolbar';

export default function PreviewPanel() {
	return (
		<div className={styles.previewPanel}>
			<PreviewToolbar />
			<PreviewFrame />
		</div>
	);
}
