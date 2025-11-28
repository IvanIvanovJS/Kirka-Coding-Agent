import { Link, useParams } from "react-router";
import styles from "./TemplateDetails.module.css";
import useFetch from "../../../hooks/useFetch";
import wrapperIframeData from "../../../utils/wrapperIframeData";
import SectionCard from "./sectionCard/SectionCard";
import ColorCard from "./colorCard/ColorCard";
import { useEffect, useState } from "react";
import PreveiwModal from "./previewModal/previewModal";
import exportAsHtml from "../../../utils/exportAsHtml";

export default function TemplateDetails() {
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const { templateId } = useParams("templateId");

	const { data, isLoading, error } = useFetch(
		`http://localhost:3030/jsonstore/templates/${templateId}`,
		null,
	);

	useEffect(() => {
		if (isPreviewOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}

		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isPreviewOpen]);

	// Temporary
	if (error) {
		console.log(error);
	}

	let content = {};
	if (isLoading) {
		console.log("Loading");
	} else {
		content = data;
	}

	const scrollToSectionHandler = (sectionId) => {
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const setPreviewFalse = () => {
		setIsPreviewOpen(false);
	};

	return (
		<div className={styles.container}>
			<Link to={"/templates"} className={styles.backButton}>
				← Templates
			</Link>

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

			<div className={styles.fixedNav}>
				<button
					type={"button"}
					className={styles.navButton}
					onClick={() => scrollToSectionHandler("thumbnail")}
				>
					Thumbnail
				</button>
				<button
					type={"button"}
					className={styles.navButton}
					onClick={() => scrollToSectionHandler("sections")}
				>
					Sections
				</button>
				<button
					type={"button"}
					className={styles.navButton}
					onClick={() => scrollToSectionHandler("colors")}
				>
					Colors
				</button>
				<button
					type={"button"}
					className={styles.navButtonPrimary}
					onClick={() => {
						setIsPreviewOpen(true);
					}}
				>
					Preview
				</button>
				<button
					type={"button"}
					className={styles.navButtonPrimary}
					onClick={() => {
						exportAsHtml(content?.full_html_template, content?.name);
					}}
				>
					Download
				</button>
				<button type={"button"} className={styles.navButtonAccent}>
					Add to App
				</button>
			</div>
			{isPreviewOpen && (
				<PreveiwModal
					isLoading={isLoading}
					content={content}
					setPreviewFalse={setPreviewFalse}
				/>
			)}
		</div>
	);
}
