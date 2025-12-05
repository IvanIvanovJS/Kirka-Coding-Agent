import { useUser } from '../../../../contexts';
import useForm from '../../../../hooks/useForm';
import formatEpoch from '../../../../utils/epochConverter';
import styles from './CommentsSection.module.css';

export default function CommentsSection({
	comments,
	templateId,
	addCommentHandler,
}) {
	const { user } = useUser();
	const postComment = async (comment) => {
		let newComment = null;
		if (!user || !comment) return;
		try {
			const response = await fetch('http://localhost:3030/data/comments', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Authorization': user.accessToken,
				},
				body: JSON.stringify({
					comment,
					templateId: templateId,
					email: user.email,
				}),
			});

			if (!response.ok) {
				throw new Error(`Server responded with status: ${response.status}`);
			}

			const data = await response.json();

			newComment = data;
		} catch (error) {
			console.error('Error posting comment:', error);
		} finally {
			addCommentHandler(newComment);
			setValues('');
			setIsSubmitting(false);
		}
	};

	const messagesHandler = (values) => {
		const { comment } = values;
		postComment(comment);
	};

	const { input, formAction, setIsSubmitting, isSubmitting, setValues } =
		useForm(messagesHandler, '');

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
										{comment.email.at(0).toUpperCase()}
									</div>
									<div className={styles.authorInfo}>
										<span className={styles.authorName}>
											{comment.email.split('@').at(0).toUpperCase()}
										</span>
										<span className={styles.commentDate}>
											{formatEpoch(comment._createdOn)}
										</span>
									</div>
								</div>
							</div>
							<p className={styles.commentText}>{comment.comment}</p>
						</div>
					))}
			</div>
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
					disabled={isSubmitting}
					className={styles.commentSubmitButton}
				>
					Post Comment
				</button>
			</form>
		</div>
	);
}
