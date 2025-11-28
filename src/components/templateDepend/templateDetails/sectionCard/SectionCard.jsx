import toPascalCase from '../../../../utils/toPascalCase'
import wrapperIframeData from '../../../../utils/wrapperIframeData'
import styles from './SectionCard.module.css'

export default function SectionCard({ temp, section }) {


    if (section[0].includes('javascript')) return;

    return (
        <div className={styles.sectionCard}>
            <div className={styles.sectionPreview}>
                <iframe
                    className={styles.sectionFrame}
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={wrapperIframeData(`${section?.at(1)}`, temp.bodyClass)}
                />
            </div>
            <div className={styles.sectionInfo}>
                <h3 className={styles.sectionName}>{toPascalCase(section?.at(0))}</h3>
                <div className={styles.sectionActions}>
                    <button className={styles.actionButton} >
                        Export Section
                    </button>
                    <button className={styles.actionButton} >
                        Add to App
                    </button>

                </div>
            </div>
        </div>
    )
}