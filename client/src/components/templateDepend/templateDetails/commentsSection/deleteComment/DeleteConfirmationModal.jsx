import { AlertIcon } from '../../../../../assets/icons';
import styles from './DeleteComment.module.css';

export default function DeleteConfirmationModal({
	handleCancelDelete,
	handleConfirmDelete,
	isSubmitting,
	isMyTemplates,
}) {
	return (
		<div className={styles.confirmOverlay} onClick={handleCancelDelete}>
			<div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.confirmHeader}>
					<AlertIcon className={styles.confirmIcon} />
					<h3 className={styles.confirmTitle}>
						Delete {isMyTemplates ? ' Template?' : ' Comment?'}
					</h3>
				</div>
				<p className={styles.confirmMessage}>
					Are you sure you want to delete this{' '}
					{isMyTemplates ? ' template?' : ' comment?'} This action cannot be
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
