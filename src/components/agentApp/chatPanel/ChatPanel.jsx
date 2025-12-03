import styles from './ChatPanel.module.css';

export default function ChatPanel() {
	return (
		<div className={styles.chatPanel}>
			<div className={styles.chatHeader}>
				<h3>AI Assistant</h3>
			</div>

			<div className={styles.messageList}>
				<div className={styles.emptyState}>
					<p>Start a conversation with the AI assistant</p>
				</div>
			</div>

			{/* <ChatInput /> */}
		</div>
	);
}
