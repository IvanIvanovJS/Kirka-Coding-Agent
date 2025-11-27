export default function SectionCard() {
    return (
        <div className={styles.sectionCard}>
            <div className={styles.sectionPreview}>
                <iframe
                    className={styles.sectionFrame}
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={wrapperIframeData(`${section.at(1)}`)}
                />
            </div>
            <div className={styles.sectionInfo}>
                <h3 className={styles.sectionName}>{section.at(0)}</h3>
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