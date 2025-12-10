import { useEffect } from 'react';
import { CheckIcon, ErrorIcon } from '../../../assets/icons';
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
			{type === 'success' && <CheckIcon />}
			{type === 'error' && <ErrorIcon aria-hidden="true" />}
			<span>{message}</span>
		</div>
	);
}
