import styles from './Features.module.css';
import ImageComparisonSlider from '../UI/imageComparisonSlider/ImageComparisonSlider';

export default function Features() {
    const comparisons = [
        {
            id: 1,
            before: '/images/fitnessBefore.webp',
            after: '/images/fitnessAfter.webp',
            title: 'AI-Powered Design Transformation',
            description: 'Watch how Kirka AI Agent transforms basic layouts into stunning, professional designs. Our intelligent system analyzes your content and applies modern design principles automatically, creating visually appealing interfaces that engage your users.',
            features: [
                'Automatic color scheme optimization',
                'Smart typography selection',
                'Responsive layout generation',
                'Modern UI components'
            ]
        },
        {
            id: 2,
            before: '/images/studioNavBefore.webp',
            after: '/images/studioNavAfter.webp',
            title: 'Intelligent Navigation Enhancement',
            description: 'Experience the power of AI-driven navigation design. Kirka analyzes your site structure and creates intuitive, user-friendly navigation systems that improve user experience and accessibility across all devices.',
            features: [
                'Smart menu organization',
                'Mobile-first responsive design',
                'Accessibility compliance',
                'Smooth animations and transitions'
            ]
        }
    ];

    return (
        <section className={styles.featuresSection} id="features">
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>See Kirka in Action</h2>
                    <p className={styles.sectionSubtitle}>
                        Discover how our AI agent transforms ordinary websites into extraordinary experiences
                    </p>
                </div>

                {comparisons.map((comparison, index) => (
                    <div
                        key={comparison.id}
                        className={`${styles.featureRow} ${index % 2 === 1 ? styles.reverse : ''}`}
                    >
                        <div className={styles.comparisonWrapper}>
                            <ImageComparisonSlider
                                beforeImage={comparison.before}
                                afterImage={comparison.after}
                                alt={comparison.title}
                            />
                        </div>

                        <div className={styles.featureContent}>
                            <h3 className={styles.featureTitle}>{comparison.title}</h3>
                            <p className={styles.featureDescription}>{comparison.description}</p>

                            <ul className={styles.featureList}>
                                {comparison.features.map((feature, idx) => (
                                    <li key={idx} className={styles.featureItem}>
                                        <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <circle cx="10" cy="10" r="10" fill="var(--accent-primary)" opacity="0.2" />
                                            <path d="M6 10L9 13L14 7" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
