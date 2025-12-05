import { Link } from 'react-router';
import { useUser } from '../../../../contexts';
import useForm from '../../../../hooks/useForm';
import formatEpoch from '../../../../utils/epochConverter';
import styles from './CommentsSection.module.css';
import { useState } from 'react';

export default function CommentsSection({
	comments,
	templateId,
	addCommentHandler,
}) {
	const { user, isAuthenticated } = useUser();
	const [error, setError] = useState(null);
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
			setError('Error:', error.message);
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

	if (error) {
		return <p className={styles.error}>{error}</p>;
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
						disabled={isSubmitting}
						className={styles.commentSubmitButton}
					>
						Post Comment
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
