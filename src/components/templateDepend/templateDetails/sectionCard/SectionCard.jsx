import { useNavigate } from "react-router";
import { useAgentApp } from "../../../../contexts";
import exportAsHtml from "../../../../utils/exportAsHtml";
import toPascalCase from "../../../../utils/toPascalCase";
import wrapperIframeData from "../../../../utils/wrapperIframeData";
import styles from "./SectionCard.module.css";

export default function SectionCard({ temp, section }) {
	
	const {setCurrentTemplate} = useAgentApp()
	const navigate = useNavigate()
	const sectionData = wrapperIframeData(`${section.at(1)}`, temp.bodyClass);
	const sectionName = toPascalCase(section.at(0));
	if (section[0].includes("javascript")) return;
	
	return (
		<div className={styles.sectionCard}>
			<div className={styles.sectionPreview}>
				<iframe
					title={section.at(0)}
					className={styles.sectionFrame}
					sandbox="allow-scripts allow-same-origin"
					srcDoc={sectionData}
				/>
			</div>
			<div className={styles.sectionInfo}>
				<h3 className={styles.sectionName}>{sectionName}</h3>
				<div className={styles.sectionActions}>
					<button
						type="button"
						className={styles.actionButton}
						onClick={() => {
							exportAsHtml(sectionData, `${temp.name} - ${sectionName}`);
						}}
					>
						Download Section
					</button>
					<button type="button" className={styles.actionButton} onClick={()=>{
						setCurrentTemplate(sectionData)
						navigate('/agent-app')
					}}>
						Add to App
					</button>
				</div>
			</div>
		</div>
	);
}
