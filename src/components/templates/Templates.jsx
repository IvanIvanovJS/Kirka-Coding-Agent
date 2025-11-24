import styles from './Templates.module.css';

export default function Templates() {
    return (
        <div className={styles.templatesContainer}>
            <h2 className={styles.title}>Templates</h2>

            <div className={styles.templatesGrid}>
                <div className={styles.templateCard}>
                    <div className={styles.cardImage}></div>
                    <h3 className={styles.cardTitle}>E-Commerce Store</h3>
                    <p className={styles.cardDescription}>
                        A modern e-commerce template with product listings, shopping cart, and checkout flow.
                    </p>
                </div>

                <div className={styles.templateCard}>
                    <div className={styles.cardImage}></div>
                    <h3 className={styles.cardTitle}>Portfolio Website</h3>
                    <p className={styles.cardDescription}>
                        Showcase your work with this elegant portfolio template featuring project galleries and contact forms.
                    </p>
                </div>

                <div className={styles.templateCard}>
                    <div className={styles.cardImage}></div>
                    <h3 className={styles.cardTitle}>Business Landing</h3>
                    <p className={styles.cardDescription}>
                        Professional landing page template perfect for startups and businesses to showcase their services.
                    </p>
                </div>

                <div className={styles.templateCard}>
                    <div className={styles.cardImage}></div>
                    <h3 className={styles.cardTitle}>Blog Platform</h3>
                    <p className={styles.cardDescription}>
                        Clean and minimal blog template with article listings, categories, and reading experience optimized.
                    </p>
                </div>

            </div>
        </div>
    )
}