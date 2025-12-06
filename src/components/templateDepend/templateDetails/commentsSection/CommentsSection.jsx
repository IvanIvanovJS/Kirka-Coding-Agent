import { Link } from 'react-router';
import { useUser } from '../../../../contexts';
import useForm from '../../../../hooks/useForm';
import formatEpoch from '../../../../utils/epochConverter';
import styles from './CommentsSection.module.css';
import { useEffect, useState } from 'react';
import EditComment from './EditComment';
import useFetch from '../../../../hooks/useFetch';
import DeleteComment from './deleteComment/DeleteComment';

export default function CommentsSection({
	comments,
	templateId,
	updateCommentHandler,
	isLoadingComments,
	commentsError,
}) {
	const [editingCommentId, setEditingCommentId] = useState(null);
	const [commentText, setCommentText] = useState(null);
	const { user, isAuthenticated } = useUser();

	const { data, isLoading, refetch, error } = useFetch(
		'http://localhost:3030/data/comments',
		null,
		'POST',
		null,
		null,
		false,
	);
	const { input, formAction, setIsSubmitting, isSubmitting, setValues } =
		useForm(messagesHandler, '');

	function messagesHandler(values) {
		const { comment } = values;

		refetch(
			{
				comment,
				templateId: templateId,
				email: user?.email,
			},
			{ 'X-Authorization': user?.accessToken },
		);
	}

	useEffect(() => {
		if (data && !isLoading && !error) {
			updateCommentHandler({ type: 'add', payload: data });
			setIsSubmitting(false);
			setValues('');
		}
	}, [
		data,
		setIsSubmitting,
		setValues,
		isLoading,
		error,
		updateCommentHandler,
	]);

	const editCommentHandler = (comment) => {
		setEditingCommentId(comment._id);
		setCommentText(comment.comment);
	};

	if (error || commentsError) {
		const errorMessage = error ? error : commentsError;
		return <p className={styles.error}>{errorMessage}</p>;
	}
	if (isLoadingComments) {
		return (
			<div className={styles.noComments}>
				<p>Loading comments data...</p>
			</div>
		);
	}

	return (
		<div className={styles.commentsContainer} id="comments">
			<h2 className={styles.sectionTitle}>Comments</h2>

			<div className={styles.commentsList}>
				{comments?.length === 0 && (
					<div className={styles.noComments}>
						<p>No comments yet. Be the first to share your thoughts!</p>
					</div>
				)}

				{comments?.length > 0 &&
					comments.map((comment) => (
						<div key={comment._id} className={styles.commentCard}>
							<div className={styles.commentHeader}>
								<div className={styles.commentAuthor}>
									<div className={styles.authorAvatar}>
										{comment.email?.at(0).toUpperCase()}
									</div>
									<div className={styles.authorInfo}>
										<span className={styles.authorName}>
											{comment.email?.split('@').at(0).toUpperCase()}
										</span>
										<span className={styles.commentDate}>
											{formatEpoch(comment._createdOn)}
										</span>
									</div>
								</div>
								{isAuthenticated && user.email === comment.email && (
									<div className={styles.commentActions}>
										<button
											type="button"
											className={styles.editButton}
											title="Edit comment"
											onClick={() => {
												editCommentHandler(comment);
											}}
										>
											<svg
												width="18"
												height="18"
												viewBox="0 0 24 24"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
												<path
													d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										</button>
										<DeleteComment
											comment={comment}
											updateCommentHandler={updateCommentHandler}
										/>
									</div>
								)}
							</div>
							{editingCommentId === comment?._id ? (
								<EditComment
									commentData={comment}
									commentText={commentText}
									setEditingCommentId={setEditingCommentId}
									setCommentText={setCommentText}
									updateCommentHandler={updateCommentHandler}
								/>
							) : (
								<p className={styles.commentText}>{comment?.comment}</p>
							)}
						</div>
					))}
			</div>

			{isAuthenticated ? (
				<form className={styles.commentForm} action={formAction}>
					<textarea
						{...input('comment')}
						className={styles.commentTextarea}
						disabled={isSubmitting}
						placeholder="Share your thoughts about this template..."
						rows={4}
					/>

					<button
						type="submit"
						disabled={isSubmitting || !input('comment').value?.trim()}
						className={styles.commentSubmitButton}
					>
						{isSubmitting ? 'Commenting...' : 'Post Comment'}
					</button>
				</form>
			) : (
				<p className={styles.notAuthenticated}>
					<Link to={'/auth/login'}>Login</Link> to post a comment.
				</p>
			)}
		</div>
	);
}
