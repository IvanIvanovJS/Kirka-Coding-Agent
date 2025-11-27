import { Link, useParams } from 'react-router';
import styles from './TemplateDetails.module.css';
import useFetch from '../../../hooks/useFetch';
import wrapperIframeData from '../../../utils/wrapperIframeData';
import SectionCard from './sectionCard/SectionCard';
import ColorCard from './colorCard/ColorCard';
import { useState } from 'react';

export default function TemplateDetails() {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const { templateId } = useParams('templateId')

    const { data, isLoading, error } = useFetch(`http://localhost:3030/jsonstore/templates/${templateId}`, null)



    let content = {}
    if (isLoading) {
        console.log('Loading')
    } else {
        content = data;
    }

    const scrollToSectionHandler = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };


    return (
        <div className={styles.container}>
            <Link to={'/templates'} className={styles.backButton} >
                ← Templates
            </Link>

            <h1 className={styles.templateName} id="thumbnail">{content?.name}</h1>

            <div className={styles.heroPreview} >

                {isLoading ? <div className={styles.skeletonHero} />
                    :
                    <iframe
                        className={styles.heroFrame}
                        sandbox="allow-scripts allow-same-origin"
                        srcDoc={wrapperIframeData(`${content.sections?.header}\n${content.sections?.hero}`, content.bodyClass)}
                    />
                }
            </div>

            <p className={styles.description}>
                {content.description}
            </p>

            <div className={styles.sectionsContainer} id="sections">
                <h2 className={styles.sectionTitle}>See the highlights of this website</h2>
                <div className={styles.sectionsGrid}>
                    {isLoading ? <></> : Object.entries(content.sections)?.map(section => <SectionCard key={section?.[0]} temp={content} section={section} />)}

                </div>
            </div>

            <div className={styles.colorPaletteContainer} id="colors">
                <h2 className={styles.sectionTitle}>Color Palette</h2>
                <div className={styles.colorPalette}>

                    {/**ColorCard */}
                    {isLoading ? <></> : Object.entries(content.config?.colors)?.map(color => <ColorCard key={color?.[0]} color={color} />)}
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
                <button className={styles.navButtonPrimary} onClick={() => {
                    setIsPreviewOpen(true)
                    console.log('test')
                }}>
                    Preveiw
                </button>
                {isPreviewOpen && (
                    <>
                        <div className={styles.backdrop} onClick={() => setIsPreviewOpen(false)} />
                        {!isLoading && (
                            <div className={styles.templatePreview}>
                                <div className={styles.iframeContainer}>
                                    <iframe
                                        className={styles.iframe}
                                        sandbox="allow-scripts allow-same-origin"
                                        srcDoc={wrapperIframeData(`${content.full_html_template}`, content.bodyClass)}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
                <button className={styles.navButtonPrimary} >
                    Export
                </button>
                <button className={styles.navButtonAccent} >
                    Add to Kirka
                </button>
            </div>
        </div>
    );
}