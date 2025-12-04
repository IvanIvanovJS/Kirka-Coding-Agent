import styles from './TemplateItem.module.css';

export default function TemplateItem({
	template
}) {
	return (
		<div className={styles.templateItem}>
			<div className={styles.templateInfo}>
				<h4 className={styles.templateName}>{template.name}</h4>
				<span className={styles.templateCategory}>{template.category}</span>
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
