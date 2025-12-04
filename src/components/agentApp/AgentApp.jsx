import styles from './AgentApp.module.css';
import ChatPanel from './chatPanel/ChatPanel';
import PreviewPanel from './previewPanel/PreviewPanel';
import TemplatesSidebar from './sidebar/TemplatesSidebar';

export default function AgentApp() {
	return (
		<div className={styles.agentApp} id="agent-app">
			<TemplatesSidebar />

			<ChatPanel />

			<PreviewPanel />
		</div>
	);
}
