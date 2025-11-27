import { Link, useParams } from 'react-router';
import styles from './TemplateDetails.module.css';
import useFetch from '../../../hooks/useFetch';
import wrapperIframeData from '../../../utils/wrapperIframeData';

export default function TemplateDetails() {

    const { templateId } = useParams('templateId')

    const { data, isLoading, error } = useFetch(`http://localhost:3030/jsonstore/templates/${templateId}`, null)

    const template = data || {};




    const scrollToSectionHandler = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };


    return (
        <div className={styles.container}>
            <Link to={'/templates'} className={styles.backButton} >
                ← Back to Templates
            </Link>

            <h1 className={styles.templateName}>{template.name}</h1>

            <div className={styles.heroPreview} id="thumbnail">

                {isLoading ? <div className={styles.skeletonHero} />
                    :
                    <iframe
                        className={styles.heroFrame}
                        sandbox="allow-scripts allow-same-origin"
                        srcDoc={wrapperIframeData(`${template.sections?.header}\n${template.sections?.hero}`)}
                    />
                }
            </div>

            <p className={styles.description}>
                {template.description}
            </p>

            <div className={styles.sectionsContainer} id="sections">
                <h2 className={styles.sectionTitle}>See the highlights of this website</h2>
                <div className={styles.sectionsGrid}>
                    {/** Sectiion card here */}

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