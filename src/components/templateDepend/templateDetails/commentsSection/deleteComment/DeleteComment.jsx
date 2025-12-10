import { useEffect, useState } from 'react';
import { TrashIcon } from '../../../../../assets/icons';
import { useUser } from '../../../../../contexts';
import useFetch from '../../../../../hooks/useFetch';
import DeleteConfirmationModalPortal from '../../../../../portals/DeleteConfirmationModalProtal';
import styles from './DeleteComment.module.css';
import DeleteConfirmationModal from './DeleteConfirmationModal';

export default function DeleteComment({ comment, updateCommentHandler }) {
	const { user } = useUser();
	const [showConfirm, setShowConfirm] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { data, error, refetch } = useFetch(
		`http://localhost:3030/data/comments/${comment._id}`,
		null,
		'DELETE',
		null,
		null,
		false,
	);

	const handleCancelDelete = () => {
		setShowConfirm(false);
	};
	const handleConfirmDelete = async () => {
		setIsSubmitting(true);
		await refetch(null, {
			'X-Authorization': user?.accessToken,
		});
		setIsSubmitting(false);
	};

	useEffect(() => {
		if (data) {
			updateCommentHandler({ type: 'delete', payload: comment._id });
		}
	}, [updateCommentHandler, data, comment._id]);

	if (error) {
		//TODO add global error handling
	}

	return (
		<>
			<button
				type="button"
				className={styles.deleteButton}
				title="Delete comment"
				onClick={() => setShowConfirm(true)}
			>
				<TrashIcon />
			</button>
			{showConfirm && (
				<DeleteConfirmationModalPortal>
					<DeleteConfirmationModal
						handleCancelDelete={handleCancelDelete}
						handleConfirmDelete={handleConfirmDelete}
						isSubmitting={isSubmitting}
					/>
				</DeleteConfirmationModalPortal>
			)}
		</>
	);
}
