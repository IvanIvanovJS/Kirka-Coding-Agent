import styles from './TemplateItem.module.css';

export default function TemplateItem() {
	return (
		<div className={styles.templateItem}>
			<div className={styles.templateInfo}>
				<h4 className={styles.templateName}>Template</h4>
				<span className={styles.templateCategory}></span>
			</div>
			<div className={styles.templateActions}>
				<button
					type="button"
					className={`${styles.actionButton} ${styles.previewButton}`}
				>
					Preview
				</button>
				<button
					type="button"
					className={`${styles.actionButton} ${styles.addButton}`}
				>
					Add
				</button>
			</div>
		</div>
	);
}
