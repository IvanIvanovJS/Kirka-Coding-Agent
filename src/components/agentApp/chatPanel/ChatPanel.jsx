import { useEffect, useRef } from 'react';
import { useAgentApp } from '../../../contexts';
import ChatInput from './chatInput/ChatInput';
import styles from './ChatPanel.module.css';
import ChatMessage from './chatMessage/ChatMessage';
import { AlertCircle } from 'lucide-react';
import GhostIcon from '../../UI/ghostIcon/GhostIcon';

export default function ChatPanel() {
	const { messages, isAiProcessing, aiError } = useAgentApp();

	const messageListRef = useRef(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <Messages array is needed to re-render after every message>
	useEffect(() => {
		if (messageListRef.current) {
			messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
		}
	}, [messages.length]);

	return (
		<div className={styles.chatPanel}>
			<div className={styles.chatHeader}>
				<h3>AI Assistant</h3>
			</div>
			<div className={styles.messageList} ref={messageListRef}>
				{messages.length === 0 && !isAiProcessing && (
					<div className={styles.emptyState}>
						<GhostIcon size={100} />
						<p>Start a conversation with Kirka AI assistant</p>
					</div>
				)}

				{messages.map((message) => (
					<ChatMessage key={message.id} message={message} />
				))}

				{isAiProcessing && (
					<div className={styles.loadingState}>
						<GhostIcon size={44} />
						<p>Kirka AI is working...</p>
					</div>
				)}

				{aiError && !isAiProcessing && (
					<div className={styles.errorState}>
						<p className={styles.errorMessage}>
							<AlertCircle size={18} /> {aiError.message}
						</p>
					</div>
				)}
			</div>

			<ChatInput />
		</div>
	);
}
