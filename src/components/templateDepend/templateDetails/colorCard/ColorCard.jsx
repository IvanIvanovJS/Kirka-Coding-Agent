import styles from './ColorCard.module.css'

export default function ColorCard(color) {
    return (
        <div className={styles.colorItem}>
            <div className={styles.colorCircle} />
            <div className={styles.colorInfo}>
                <span className={styles.colorName}></span>
                <span className={styles.colorValue}></span>
            </div>
        </div>
    )
}