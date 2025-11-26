import wrapperIframeData from '../../utils/wrapperIframeData'
import styles from './TemplateCard.module.css'

export default function TemplateCard({
    temp,
}) {

    console.log()
    return (
        <div className={styles.templateCard}>
            <div className={styles.previewWrapper}>
                <iframe
                    className={styles.previewFrame}
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={wrapperIframeData(temp.thumbnail)}
                />
            </div>
            <h3 className={styles.cardTitle}>{temp.name}</h3>
            <p className={styles.cardDescription}>
                {temp.description}
            </p>
        </div>
    )
}