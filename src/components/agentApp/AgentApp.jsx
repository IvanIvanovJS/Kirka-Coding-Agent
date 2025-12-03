import styles from './AgentApp.module.css';
import TemplatesSidebar from './templatesSideBar/templatesSidebar';

export default function AgentApp() {
	return (
		<div className={styles.agentApp}>
			<TemplatesSidebar />
			{/*
			<ChatPanel />

			<PreviewPanel /> */}
		</div>
	);
}
