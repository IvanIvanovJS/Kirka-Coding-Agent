import styles from './CommentsSection.module.css';

export default function CommentsSection() {
	return (
		<div className={styles.commentsContainer} id="comments">
			<h2 className={styles.sectionTitle}>Comments</h2>

			<div className={styles.commentsList}>
				<div className={styles.noComments}>
					<p>No comments yet. Be the first to share your thoughts!</p>
				</div>

				<div className={styles.commentCard}>
					<div className={styles.commentHeader}>
						<div className={styles.commentAuthor}>
							<div className={styles.authorAvatar}>
								<svg
									width="30"
									height="30"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<circle cx="12" cy="8" r="4" fill="currentColor" />
									<path
										d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
									/>
								</svg>
							</div>
							<div className={styles.authorInfo}>
								<span className={styles.authorName}>Ivan</span>
								<span className={styles.commentDate}>12.25</span>
							</div>
						</div>
					</div>
					<p className={styles.commentText}>Ivan e programist</p>
				</div>
			</div>

			<form className={styles.commentForm}>
				<textarea
					className={styles.commentTextarea}
					placeholder="Share your thoughts about this template..."
					rows={4}
				/>
				<button type="submit" className={styles.commentSubmitButton}>
					Post Comment
				</button>
			</form>
		</div>
	);
}
