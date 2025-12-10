import { useState } from 'react';
import styles from './AgentApp.module.css';
import ChatPanel from './chatPanel/ChatPanel';
import PreviewPanel from './previewPanel/PreviewPanel';
import TemplatesSidebar from './sidebar/TemplatesSidebar';
import SplashScreen from '../UI/SplashScreen';

export default function AgentApp() {
	const [showSplash, setShowSplash] = useState(true);

	
	const handleSplashFinished = () => {
		setShowSplash(false);
	};

	return (
		<>
			{showSplash && <SplashScreen onFinished={handleSplashFinished} />}
			
			<div 
				className={styles.agentApp} 
				id="agent-app"
				style={{ opacity: showSplash ? 0 : 1 }}
			>
				<TemplatesSidebar />

				<ChatPanel />

				<PreviewPanel />
			</div>
		</>
	);
}
