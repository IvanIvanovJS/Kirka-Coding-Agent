import styles from './TemplateCard.module.css'

export default function TemplateCard({
    temp,
}) {
    return (
        <div className={styles.templateCard}>
            <div className={styles.previewWrapper}>
                <iframe
                    className={styles.previewFrame}
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={iFrameInputSrc}
                />
            </div>
            <h3 className={styles.cardTitle}>Portfolio Website</h3>
            <p className={styles.cardDescription}>
                Showcase your work with this elegant portfolio template featuring project galleries and contact forms.
            </p>
        </div>
    )
}