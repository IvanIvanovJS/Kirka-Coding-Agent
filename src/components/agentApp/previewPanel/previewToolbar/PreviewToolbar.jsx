import { useEffect } from 'react';
import { useAgentApp, useUser } from '../../../../contexts';
import useFetch from '../../../../hooks/useFetch';
import exportAsHtml from '../../../../utils/exportAsHtml';
import styles from './PreviewToolbar.module.css';

export default function PreviewToolbar() {
	const { handleSetPreviewMode, currentTemplate } = useAgentApp();
	const { user, isAuthenticated } = useUser();
	const isOwner = currentTemplate?._ownerId === user?._id;
	const { data: postData, refetch: postRefetch } = useFetch(
		`http://localhost:3030/data/user-${user?._id}`,
		null,
		'POST',
		null,
		null,
		false,
	);

	const handleSave = () => {
		if (!isAuthenticated) {
			return;
		}
		postRefetch(currentTemplate, { 'X-Authorization': user?.accessToken });
	};

	const { data: editedData, refetch: editRefetch } = useFetch(
		`http://localhost:3030/data/user-${user?._id}/${currentTemplate?._id}`,
		null,
		'PUT',
		null,
		null,
		false,
	);

	const handleEdit = () => {
		if (!isAuthenticated) {
			return;
		}
		editRefetch(currentTemplate, { 'X-Authorization': user?.accessToken });
	};

	useEffect(() => {
		if (editedData) {
			console.log(editedData);
		}
	});

	useEffect(() => {
		if (postData) {
			console.log(postData);
		}
	});

	return (
		<div className={styles.toolbar}>
			<div className={styles.modeToggle}>
				<button
					className={styles.modeButton}
					type="button"
					aria-label="Desktop preview mode"
					onClick={() => handleSetPreviewMode('desktop')}
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
						<line x1="8" y1="21" x2="16" y2="21" />
						<line x1="12" y1="17" x2="12" y2="21" />
					</svg>
					<span>Desktop</span>
				</button>
				<button
					type="button"
					className={styles.modeButton}
					aria-label="Mobile preview mode"
					onClick={() => handleSetPreviewMode('mobile')}
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
						<line x1="12" y1="18" x2="12.01" y2="18" />
					</svg>
					<span>Mobile</span>
				</button>
			</div>

			<div className={styles.actions}>
				<button
					type="button"
					className={styles.actionButton}
					aria-label="Export as HTML"
					disabled={!currentTemplate}
					onClick={() =>
						exportAsHtml(
							currentTemplate.full_html_template,
							currentTemplate.name,
						)
					}
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
					<span>Export as HTML</span>
				</button>
				<button
					type="button"
					className={styles.actionButton}
					aria-label="Save template"
					disabled={!currentTemplate}
					onClick={() => {
						handleSave();
					}}
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
						<polyline points="17 21 17 13 7 13 7 21" />
						<polyline points="7 3 7 8 15 8" />
					</svg>
					<span>Save as New</span>
				</button>
				{isOwner && (
					<button
						type="button"
						className={styles.actionButton}
						aria-label="Save template"
						disabled={!currentTemplate}
						onClick={() => {
							handleEdit();
						}}
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
							<polyline points="17 21 17 13 7 13 7 21" />
							<polyline points="7 3 7 8 15 8" />
						</svg>
						<span>Save as existing</span>
					</button>
				)}
			</div>
		</div>
	);
}
