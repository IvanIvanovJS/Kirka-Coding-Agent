import { Link } from 'react-router'
import wrapperIframeData from '../../../utils/wrapperIframeData'
import styles from './TemplateCard.module.css'

export default function TemplateCard({
    temp,
    isLoading
}) {


    const cardIframe = () => (<><div className={styles.previewWrapper}>
        <iframe
            className={styles.previewFrame}
            sandbox="allow-scripts allow-same-origin"
            srcDoc={wrapperIframeData(temp?.thumbnail)}
        />
    </div>
        <h3 className={styles.cardTitle}>{temp?.name}</h3>
        <p className={styles.cardDescription}>
            {temp?.description}
        </p>
        <Link to={`/templates/${temp?.id}/details`} className={styles.detailsButton}>
            Details
        </Link>
    </>)


    const cardSkeleton = () => {
        return (
            <>
                <div className={styles.cardSkeleton} />
                <button className={styles.detailsButton}>
                    Loading...
                </button>
            </>
        )
    }
    return (
        <div className={styles.templateCard}>
            {isLoading || !temp ? cardSkeleton() : cardIframe()}
        </div>
    )
}