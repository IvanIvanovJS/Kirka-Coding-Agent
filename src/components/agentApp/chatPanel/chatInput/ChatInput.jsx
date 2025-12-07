import { useAgentApp } from '../../../../contexts';
import useForm from '../../../../hooks/useForm';
import styles from './ChatInput.module.css';
import { Send } from 'lucide-react';
export default function ChatInput() {
	const { sendMessage, isAiProcessing, currentTemplate } = useAgentApp();
	const { input, formAction, setValues } = useForm(sendHandler, {
		message: '',
	});

	async function sendHandler(value) {
		const { message } = value;

		if (!message.trim()) {
			return;
		}

		sendMessage(message);
		setValues(null);
	}

	return (
		<form className={styles.chatInput} action={formAction}>
			<input
				type="text"
				placeholder={
					currentTemplate
						? 'Instruct your personal website builder...'
						: 'Add template to chat.'
				}
				{...input('message')}
				disabled={isAiProcessing || !currentTemplate}
				className={styles.input}
			/>
			<button
				type="submit"
				disabled={
					isAiProcessing || !currentTemplate || !input('message').value?.trim()
				}
				className={styles.sendButton}
			>
				{isAiProcessing ? (
					'Sending...'
				) : (
					<>
						<Send size={18} />
						<span>Send</span>
					</>
				)}
			</button>
		</form>
	);
}
