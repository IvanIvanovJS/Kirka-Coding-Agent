import styles from './DeleteComment.module.css';

export default function DeleteConfirmationModal({
	handleCancelDelete,
	handleConfirmDelete,
	isSubmitting,
}) {
	return (
		<div className={styles.confirmOverlay} onClick={handleCancelDelete}>
			<div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.confirmHeader}>
					<svg
						className={styles.confirmIcon}
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					<h3 className={styles.confirmTitle}>Delete Comment?</h3>
				</div>
				<p className={styles.confirmMessage}>
					Are you sure you want to delete this comment? This action cannot be
					undone.
				</p>
				<div className={styles.confirmActions}>
					<button
						type="button"
						className={styles.confirmCancelButton}
						onClick={handleCancelDelete}
					>
						Cancel
					</button>
					<button
						type="button"
						className={styles.confirmDeleteButton}
						onClick={handleConfirmDelete}
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Deleting...' : 'Delete'}
					</button>
				</div>
			</div>
		</div>
	);
}
