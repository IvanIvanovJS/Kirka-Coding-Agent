import GhostIcon from '../../../UI/ghostIcon/GhostIcon';
import formatEpoch from '../../../../utils/epochConverter';
import styles from './ChatMessage.module.css';

export default function ChatMessage({ message }) {
	const { content, isUser, timestamp } = message;
	const formattedTime = formatEpoch(timestamp);

	return (
		<div
			className={`${styles.messageWrapper} ${isUser ? styles.userMessage : styles.aiMessage}`}
		>
			{!isUser && (
				<div className={styles.iconWrapper}>
					<GhostIcon size={60} />
				</div>
			)}
			<div className={styles.messageContent}>
				<div className={styles.messageText}>{content}</div>
				<div className={styles.timestamp}>{formattedTime}</div>
			</div>
		</div>
	);
}
