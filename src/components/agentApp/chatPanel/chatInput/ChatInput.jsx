import styles from './ChatInput.module.css';

export default function ChatInput() {
	return (
		<div className={styles.chatInput}>
			<input
				type="text"
				placeholder="Type your message..."
				className={styles.input}
			/>
			<button type="button" className={styles.sendButton}>
				Send
			</button>
		</div>
	);
}
