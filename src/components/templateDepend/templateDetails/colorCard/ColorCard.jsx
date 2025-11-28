import styles from "./ColorCard.module.css";

export default function ColorCard({ color }) {
	return (
		<div className={styles.colorItem}>
			<div className={styles.colorCircle} style={{ background: color.at(1) }} />
			<div className={styles.colorInfo}>
				<span className={styles.colorName}>{color.at(0)}</span>
				<span className={styles.colorValue}>{color.at(1)}</span>
			</div>
		</div>
	);
}
