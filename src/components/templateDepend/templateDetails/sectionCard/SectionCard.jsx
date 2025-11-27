import toPascalCase from '../../../../utils/toPascalCase'
import wrapperIframeData from '../../../../utils/wrapperIframeData'
import styles from './SectionCard.module.css'

export default function SectionCard({ section }) {

    const sectionData = section;

    if (section[0].includes('javascript')) return;

    return (
        <div className={styles.sectionCard}>
            <div className={styles.sectionPreview}>
                <iframe
                    className={styles.sectionFrame}
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={wrapperIframeData(`${sectionData?.at(1)}`)}
                />
            </div>
            <div className={styles.sectionInfo}>
                <h3 className={styles.sectionName}>{toPascalCase(sectionData?.at(0))}</h3>
                <div className={styles.sectionActions}>
                    <button className={styles.actionButton} >
                        Add to Kirka
                    </button>
                    <button className={styles.actionButton} >
                        Export Section
                    </button>
                </div>
            </div>
        </div>
    )
}