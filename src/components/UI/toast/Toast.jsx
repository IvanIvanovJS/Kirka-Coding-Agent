import { useEffect } from 'react';
import styles from './Toast.module.css';

export default function Toast({
	message,
	type = 'success',
	onClose,
	duration = 3500,
}) {
	useEffect(() => {
		if (duration) {
			const timer = setTimeout(() => {
				onClose();
			}, duration);

			return () => clearTimeout(timer);
		}
	}, [duration, onClose]);

	return (
		<div className={`${styles.toast} ${styles[type]}`}>
			{type === 'success' && (
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				>
					<polyline points="20 6 9 17 4 12" />
				</svg>
			)}
			{type === 'error' && (
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="9"></circle>
					<line x1="15" y1="9" x2="9" y2="15"></line>
					<line x1="9" y1="9" x2="15" y2="15"></line>
				</svg>
			)}
			<span>{message}</span>
		</div>
	);
}
