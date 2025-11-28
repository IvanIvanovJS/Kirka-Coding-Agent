import wrapperIframeData from '../../../utils/wrapperIframeData'
import styles from './PreviewModal.module.css'

export default function PreveiwModal({
    isLoading,
    content,
    setPreviewFalse
}) {
    return (
        <>
            <div
                className={styles.backdrop}
                onClick={() => setPreviewFalse()}
            />
            {!isLoading && (
                <div className={styles.templatePreview}>
                    <div className={styles.modalHeader}>
                        <div className={styles.modalActions}>
                            <button className={styles.modalButton}>Export</button>
                            <button className={styles.modalButton}>Add to app</button>
                        </div>
                        <button
                            className={styles.closeButton}
                            onClick={() => setPreviewFalse()}
                        >
                            🗙
                        </button>
                    </div>
                    <div className={styles.iframeContainer}>
                        <iframe
                            className={styles.iframe}
                            sandbox="allow-scripts allow-same-origin"
                            srcDoc={wrapperIframeData(
                                `${content.full_html_template}`,
                                content.bodyClass
                            )}
                        />
                    </div>
                </div>
            )}
        </>
    )
}