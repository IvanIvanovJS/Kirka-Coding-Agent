import { Link, useLocation, useNavigate, useParams } from 'react-router';
import styles from './TemplateDetails.module.css';
import useFetch from '../../../hooks/useFetch';
import wrapperIframeData from '../../../utils/wrapperIframeData';
import SectionCard from './sectionCard/SectionCard';
import ColorCard from './colorCard/ColorCard';
import { useCallback, useEffect, useState } from 'react';
import PreveiwModal from './previewModal/PreviewModal';
import exportAsHtml from '../../../utils/exportAsHtml';
import { useAgentApp, useUser } from '../../../contexts';
import CommentsSection from './commentsSection/CommentsSection';
import DeleteConfirmationModalPortal from '../../../portals/DeleteConfirmationModalProtal';
import DeleteConfirmationModal from './commentsSection/deleteComment/DeleteConfirmationModal';
import Toast from '../../UI/toast/Toast';

export default function TemplateDetails() {
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [comments, setComments] = useState(null);
	const [toast, setToast] = useState(null);
	const { templateId } = useParams('templateId');
	const { setCurrentTemplate, refechMyTemplates, currentTemplate } =
		useAgentApp();
	const { isAuthenticated, user } = useUser();
	const navigate = useNavigate();
	const location = useLocation();
	const isMyTemplates = location.pathname.includes('user-');
	const isHistoryOn = window.history.length > 2;
	const url = isMyTemplates
		? `http://localhost:3030/data/user-${user._id}/${templateId}`
		: `http://localhost:3030/data/templates/${templateId}`;

	const commentsUrl = isMyTemplates
		? `http://localhost:3030/data/comments/user-${user._id}?where=templateId%3D%22${templateId}%22`
		: `http://localhost:3030/data/comments?where=templateId%3D%22${templateId}%22`;
	const { data, isLoading, error } = useFetch(url, null, 'GET');

	const {
		data: commentsData,
		isLoading: isLoadingComments,
		error: commentsError,
	} = useFetch(commentsUrl, null, 'GET');

	useEffect(() => {
		setComments(commentsData);
	}, [commentsData]);

	const {
		data: dataOnDelete,
		error: errorOnDelete,
		refetch: refetchOnDelete,
	} = useFetch(
		`http://localhost:3030/data/user-${user?._id}/${templateId}`,
		null,
		'DELETE',
		null,
		null,
		false,
	);

	const {
		data: dataOnPublish,
		error: errorOnPublish,
		refetch: refetchOnPublish,
	} = useFetch(
		`http://localhost:3030/data/templates`,
		null,
		'POST',
		null,
		null,
		false,
	);

	useEffect(() => {
		if (dataOnDelete) {
			console.log(dataOnDelete);
			navigate('/my-templates');
		}
	}, [dataOnDelete, navigate]);

	useEffect(() => {
		if (errorOnDelete) {
			console.log(errorOnDelete);
		}
	}, [errorOnDelete]);

	useEffect(() => {
		if (dataOnPublish) {
			setToast({
				message: 'Template published successfully!',
				type: 'success',
			});
		}
	}, [dataOnPublish]);

	useEffect(() => {
		if (errorOnPublish) {
			setToast({
				message: 'Failed to publish template. Please try again.',
				type: 'error',
			});
		}
	}, [errorOnPublish]);

	const handleDelete = async () => {
		setIsDeleting(true);
		await refetchOnDelete(null, {
			'X-Authorization': user?.accessToken,
		});
		await refechMyTemplates();
		if (currentTemplate?._id === templateId) {
			setCurrentTemplate(null);
		}
		setIsDeleting(false);
		setShowDeleteConfirm(false);
	};

	const handleCancelDelete = () => {
		setShowDeleteConfirm(false);
	};

	const handlePublish = async () => {
		setIsPublishing(true);
		await refetchOnPublish(content, {
			'Content-Type': 'application/json',
			'X-Authorization': user?.accessToken,
		});
		setIsPublishing(false);
	};

	const updateCommentHandler = useCallback((action) => {
		setComments((prev) => {
			const current = Array.isArray(prev) ? prev : [];

			switch (action.type) {
				case 'add': {
					return [...current, action.payload];
				}

				case 'update': {
					return current.map((c) =>
						c._id === action.payload._id ? action.payload : c,
					);
				}

				case 'delete': {
					return current.filter((c) => c._id !== action.payload);
				}

				default:
					return current;
			}
		});
	}, []);

	useEffect(() => {
		if (isPreviewOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}

		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [isPreviewOpen]);

	const scrollToSectionHandler = (sectionId) => {
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	const setPreviewFalse = () => {
		setIsPreviewOpen(false);
	};

	let content = {};
	if (!isLoading) {
		content = data;
	}

	const GoBack = (
		<Link to={isHistoryOn ? -1 : '/'} className={styles.backButton}>
			← Templates
		</Link>
	);

	if (error) {
		return (
			<div className={styles.container} id="details">
				{GoBack}

				<p className={styles.error}>{error}: Please try again later!</p>
			</div>
		);
	}

	return (
		<div className={styles.container} id="details">
			{GoBack}

			<h1 className={styles.templateName} id="thumbnail">
				{content?.name}
			</h1>

			<div className={styles.heroPreview}>
				{isLoading ? (
					<div className={styles.skeletonHero} />
				) : (
					<iframe
						title={content?.name}
						className={styles.heroFrame}
						sandbox="allow-scripts allow-same-origin"
						srcDoc={wrapperIframeData(
							`${content.sections?.header}\n${content.sections?.hero}`,
							content.bodyClass,
						)}
					/>
				)}
			</div>

			<p className={styles.description}>{content.description}</p>

			<div className={styles.sectionsContainer} id="sections">
				<h2 className={styles.sectionTitle}>
					See the highlights of this website
				</h2>
				<div className={styles.sectionsGrid}>
					{!isLoading &&
						Object.entries(content.sections)?.map((section) => (
							<SectionCard
								key={section?.[0]}
								temp={content}
								section={section}
							/>
						))}
				</div>
			</div>

			<div className={styles.colorPaletteContainer} id="colors">
				<h2 className={styles.sectionTitle}>Color Palette</h2>
				<div className={styles.colorPalette}>
					{/**ColorCard */}
					{!isLoading &&
						Object.entries(content.config?.colors)?.map((color) => (
							<ColorCard key={color?.[0]} color={color} />
						))}
				</div>
			</div>

			<CommentsSection
				comments={comments}
				templateId={templateId}
				updateCommentHandler={updateCommentHandler}
				isLoadingComments={isLoadingComments}
				commentsError={commentsError}
			/>

			<div className={styles.fixedNav}>
				<button
					type={'button'}
					className={styles.navButton}
					onClick={() => scrollToSectionHandler('thumbnail')}
				>
					Thumbnail
				</button>
				<button
					type={'button'}
					className={styles.navButton}
					onClick={() => scrollToSectionHandler('sections')}
				>
					Sections
				</button>
				<button
					type={'button'}
					className={styles.navButton}
					onClick={() => scrollToSectionHandler('colors')}
				>
					Colors
				</button>
				<button
					type={'button'}
					className={styles.navButton}
					onClick={() => scrollToSectionHandler('comments')}
				>
					Comments
				</button>
				<button
					type={'button'}
					className={styles.navButtonPrimary}
					onClick={() => {
						setIsPreviewOpen(true);
					}}
				>
					Preview
				</button>
				<button
					type={'button'}
					className={styles.navButtonPrimary}
					onClick={() => {
						exportAsHtml(content?.full_html_template, content?.name);
					}}
					title={isAuthenticated ? 'Download as HTML' : 'Login for access'}
					disabled={!isAuthenticated}
				>
					Download
				</button>
				<button
					type={'button'}
					className={styles.navButtonAccent}
					onClick={() => {
						setCurrentTemplate(content);
						navigate('/agent-app');
					}}
					title={isAuthenticated ? 'Modify with Kirka' : 'Login for access'}
					disabled={!isAuthenticated}
				>
					{isMyTemplates ? 'Edit in App' : 'Add to App'}
				</button>
				{isMyTemplates && isAuthenticated && (
					<>
						<button
							type={'button'}
							className={styles.navButtonAccent}
							onClick={handlePublish}
							title={'Publish template to all users'}
							disabled={!isAuthenticated || isPublishing}
						>
							{isPublishing ? 'Publishing...' : 'Publish'}
						</button>
						<button
							type={'button'}
							className={styles.deleteButton}
							onClick={() => setShowDeleteConfirm(true)}
							title={'Permanently deleting template'}
							disabled={!isAuthenticated}
						>
							Delete
						</button>
					</>
				)}
			</div>
			{isPreviewOpen && (
				<PreveiwModal
					isLoading={isLoading}
					content={content}
					setPreviewFalse={setPreviewFalse}
				/>
			)}
			{showDeleteConfirm && (
				<DeleteConfirmationModalPortal>
					<DeleteConfirmationModal
						handleCancelDelete={handleCancelDelete}
						handleConfirmDelete={handleDelete}
						isSubmitting={isDeleting}
						isMyTemplates={isMyTemplates}
					/>
				</DeleteConfirmationModalPortal>
			)}
			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}
		</div>
	);
}
