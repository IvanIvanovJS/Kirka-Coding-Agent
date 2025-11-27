import styles from './TemplateDetails.module.css';

export default function TemplateDetails() {

    const scrollToSectionHandler = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };


    return (
        <div className={styles.container}>
            <button className={styles.backButton} >
                ← Back to Templates
            </button>

            <h1 className={styles.templateName}></h1>

            <div className={styles.heroPreview} id="thumbnail">
                <iframe
                    className={styles.heroFrame}
                    sandbox="allow-scripts allow-same-origin"
                />
            </div>

            <p className={styles.description}></p>

            <div className={styles.sectionsContainer} id="sections">
                <h2 className={styles.sectionTitle}>See the highlights of this website</h2>
                <div className={styles.sectionsGrid}>

                    <div className={styles.sectionCard}>
                        <div className={styles.sectionPreview}>
                            <iframe
                                className={styles.sectionFrame}
                                sandbox="allow-scripts allow-same-origin"

                            />
                        </div>
                        <div className={styles.sectionInfo}>
                            <h3 className={styles.sectionName}></h3>
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

                </div>
            </div>

            <div className={styles.colorPaletteContainer} id="colors">
                <h2 className={styles.sectionTitle}>Color Palette</h2>
                <div className={styles.colorPalette}>

                    <div className={styles.colorItem}>
                        <div className={styles.colorCircle} />
                        <div className={styles.colorInfo}>
                            <span className={styles.colorName}></span>
                            <span className={styles.colorValue}></span>
                        </div>
                    </div>

                </div>
            </div>

            <div className={styles.fixedNav}>
                <button className={styles.navButton} onClick={() => scrollToSectionHandler('thumbnail')}>
                    Thumbnail
                </button>
                <button className={styles.navButton} onClick={() => scrollToSectionHandler('sections')}>
                    Sections
                </button>
                <button className={styles.navButton} onClick={() => scrollToSectionHandler('colors')}>
                    Colors
                </button>
                <button className={styles.navButtonPrimary} >
                    Export Template
                </button>
                <button className={styles.navButtonAccent} >
                    Add to Kirka
                </button>
            </div>
        </div>
    );
}