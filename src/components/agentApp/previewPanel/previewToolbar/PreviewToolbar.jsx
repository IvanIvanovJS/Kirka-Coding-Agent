import { useEffect, useState, useRef, useCallback } from 'react';
import { useAgentApp, useUser } from '../../../../contexts';
import useFetch from '../../../../hooks/useFetch';
import exportAsHtml from '../../../../utils/exportAsHtml';
import styles from './PreviewToolbar.module.css';

export default function PreviewToolbar() {
	const {
		handleSetPreviewMode,
		currentTemplate,
		handleSetTemplateViewMode,
		refechMyTemplates,
		setCurrentTemplate,
		myTemplates = [],
	} = useAgentApp();
	const { user, isAuthenticated } = useUser();
	const isOwner = currentTemplate?._ownerId === user?._id;
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [toast, setToast] = useState(null);
	const dropdownRef = useRef(null);
	const toastTimeoutRef = useRef(null);
	const {
		data: postData,
		error: postError,
		refetch: postRefetch,
	} = useFetch(
		`http://localhost:3030/data/user-${user?._id}`,
		null,
		'POST',
		null,
		null,
		false,
	);

	const handleSave = async () => {
		setIsDropdownOpen(false);
		if (!isAuthenticated) {
			return;
		}
		try {
			await postRefetch(currentTemplate, {
				'X-Authorization': user?.accessToken,
			});
			await refechMyTemplates();

			showToast('Template saved as new');
			handleSetTemplateViewMode('myTemplates');
		} catch {
			showToast('Something went wrong, please try again later');
		}
	};

	const { refetch: editRefetch } = useFetch(
		`http://localhost:3030/data/user-${user?._id}/${currentTemplate?._id}`,
		null,
		'PUT',
		null,
		null,
		false,
	);

	const handleEdit = async () => {
		setIsDropdownOpen(false);
		if (!isAuthenticated) {
			return;
		}
		try {
			await editRefetch(currentTemplate, {
				'X-Authorization': user?.accessToken,
			});
			await refechMyTemplates();
			setIsDropdownOpen(false);
			showToast('Template updated successfully');
			handleSetTemplateViewMode('myTemplates');
		} catch {
			showToast('Something went wrong, please try again later');
		}
	};

	const showToast = useCallback((message) => {
		if (toastTimeoutRef.current) {
			clearTimeout(toastTimeoutRef.current);
		}
		setToast(message);
		toastTimeoutRef.current = setTimeout(() => {
			setToast(null);
		}, 3500);
	}, []);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsDropdownOpen(false);
			}
		};

		if (isDropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isDropdownOpen]);

	useEffect(() => {
		return () => {
			if (toastTimeoutRef.current) {
				clearTimeout(toastTimeoutRef.current);
			}
		};
	}, []);
	useEffect(() => {
		if (postError) {
			console.log(postError);
		}
	}, [postError]);

	useEffect(() => {
		if (postData) {
			setCurrentTemplate(myTemplates[myTemplates?.length - 1]);
		}
	}, [postData, myTemplates, setCurrentTemplate]);

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
					disabled={!isAuthenticated || !currentTemplate}
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

				<div className={styles.saveWrapper} ref={dropdownRef}>
					<button
						type="button"
						className={styles.actionButton}
						aria-label="Save template"
						disabled={!isAuthenticated || !currentTemplate}
						onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
						<span>Save</span>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							className={`${styles.chevron} ${isDropdownOpen ? styles.chevronOpen : ''}`}
						>
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</button>

					{isDropdownOpen && (
						<div className={styles.dropdown}>
							<button
								type="button"
								className={styles.dropdownItem}
								onClick={handleSave}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
									<polyline points="17 21 17 13 7 13 7 21" />
									<polyline points="7 3 7 8 15 8" />
								</svg>
								<div className={styles.saveButtonsWrapper}>
									<span>Save as New</span>
									<span className={styles.saveSubText}>
										Creates new template
									</span>
								</div>
							</button>
							{isOwner && myTemplates.length > 0 && (
								<button
									type="button"
									className={styles.dropdownItem}
									onClick={handleEdit}
								>
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
									</svg>
									<div className={styles.saveButtonsWrapper}>
										<span>Save as Existing</span>
										<span className={styles.saveSubText}>
											Update current template
										</span>
									</div>
								</button>
							)}
						</div>
					)}

					{toast && (
						<div className={postError ? styles.toastError : styles.toast}>
							{postError ? (
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<circle cx="12" cy="12" r="9"></circle>
									<line x1="15" y1="9" x2="9" y2="15"></line>
									<line x1="9" y1="9" x2="15" y2="15"></line>
								</svg>
							) : (
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							)}
							<span>{toast}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
