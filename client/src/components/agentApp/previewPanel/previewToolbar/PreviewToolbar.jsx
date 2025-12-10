import { useEffect, useState, useRef, useCallback } from 'react';
import {
	DesktopIcon,
	MobileIcon,
	DownloadIcon,
	SaveIcon,
	ChevronDownIcon,
	EditIcon,
	ErrorIcon,
	CheckIcon,
} from '../../../../assets/icons';
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

	const { error: editError, refetch: editRefetch } = useFetch(
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
					<DesktopIcon />
					<span>Desktop</span>
				</button>
				<button
					type="button"
					className={styles.modeButton}
					aria-label="Mobile preview mode"
					onClick={() => handleSetPreviewMode('mobile')}
				>
					<MobileIcon />
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
					<DownloadIcon />
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
						<SaveIcon />
						<span>Save</span>
						<ChevronDownIcon
							className={`${styles.chevron} ${isDropdownOpen ? styles.chevronOpen : ''}`}
						/>
					</button>

					{isDropdownOpen && (
						<div className={styles.dropdown}>
							<button
								type="button"
								className={styles.dropdownItem}
								onClick={handleSave}
							>
								<SaveIcon width={16} height={16} />
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
									<EditIcon width={16} height={16} />
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
						<div
							className={postError || editError ? styles.toastError : styles.toast}
						>
							{postError || editError ? (
								<ErrorIcon aria-hidden="true" />
							) : (
								<CheckIcon width={16} height={16} />
							)}
							<span>{toast}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
