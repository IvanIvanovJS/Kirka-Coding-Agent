import { useAgentApp } from '../../../contexts';
import PreviewFrame from './previewFrame/PreviewFrame';
import styles from './PreviewPanel.module.css';
import PreviewToolbar from './previewToolbar/PreviewToolbar';

export default function PreviewPanel() {
	const { isSidebarVisible } = useAgentApp();
	return (
		<div
			className={`${styles.previewPanel} ${!isSidebarVisible ? styles.previewPanelExpanded : ''}`}
		>
			<PreviewToolbar />
			<PreviewFrame />
		</div>
	);
}
