import styles from './CommentsSection.module.css';

export default function EditComment({ comment }) {
	return (
		<div className={styles.editForm}>
			<textarea className={styles.commentTextarea} rows={4} />
			<div className={styles.editActions}>
				<button type="button" className={styles.saveButton}>
					Save
				</button>
				<button type="button" className={styles.cancelButton}>
					Cancel
				</button>
			</div>
		</div>
	);
}
