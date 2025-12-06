import useFetch from '../../../../hooks/useFetch';
import useForm from '../../../../hooks/useForm';
import styles from './CommentsSection.module.css';
import { useUser } from '../../../../contexts';
import { useEffect } from 'react';

export default function EditComment({
	commentData,
	commentText,
	setEditingCommentId,
	setCommentText,
}) {
	const { user } = useUser();
	const { formAction, input, isSubmitting, setIsSubmitting } = useForm(
		onSaveHandler,
		{
			comment: commentText,
		},
	);

	const { data, refetch } = useFetch(
		`http://localhost:3030/data/comments/${commentData._id}`,
		null,
		'PUT',
		null,
		null,
		false,
	);

	async function onSaveHandler(values) {
		const { comment } = values;

		refetch(
			{ ...commentData, comment },
			{ 'X-Authorization': user?.accessToken },
		);
		setIsSubmitting(true);
	}

	useEffect(() => {
		if (data) {
			setEditingCommentId(null);
			setCommentText(null);
			setIsSubmitting(false);
		}
	}, [data, setIsSubmitting, setEditingCommentId, setCommentText]);

	return (
		<form className={styles.editForm} action={formAction}>
			<textarea
				className={styles.commentTextarea}
				{...input('comment')}
				disabled={isSubmitting}
				rows={4}
			/>
			<div className={styles.editActions}>
				<button
					type="submit"
					className={styles.saveButton}
					disabled={isSubmitting}
				>
					Save
				</button>
				<button
					type="button"
					onClick={() => {
						setEditingCommentId(null);
					}}
					className={styles.cancelButton}
				>
					Cancel
				</button>
			</div>
		</form>
	);
}
