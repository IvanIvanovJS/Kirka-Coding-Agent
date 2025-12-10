import { GhostIcon as GhostIconSvg } from '../../../assets/icons';
import styles from './GhostIcon.module.scss';

export default function GhostIcon({
	className = '',
	size = 100,
	isWorking = false,
	onApp = false,
}) {
	const isIdle = onApp ? styles.idle : '';
	const animationClass = isWorking ? styles.working : isIdle;

	return (
		<GhostIconSvg
			size={size}
			isWorking={isWorking}
			onApp={onApp}
			className={`${styles.ghostIcon} ${animationClass} ${className}`}
		/>
	);
}
