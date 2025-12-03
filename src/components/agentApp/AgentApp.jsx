import styles from './AgentApp.module.css';
import ChatPanel from './chatPanel/ChatPanel';
import PreviewPanel from './previewPanel/PreviewPanel';
import TemplatesSidebar from './templatesSideBar/templatesSidebar';

export default function AgentApp() {
	return (
		<div className={styles.agentApp}>
			<TemplatesSidebar />

			<ChatPanel />

			<PreviewPanel />
		</div>
	);
}
