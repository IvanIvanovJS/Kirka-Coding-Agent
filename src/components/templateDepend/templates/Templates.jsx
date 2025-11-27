import useFetch from '../../../hooks/useFetch';
import TemplateCard from '../templateCard/TemplateCard';
import styles from './Templates.module.css';

const SKELETON_COUNT = 4;

export default function Templates() {

    const { data, isLoading, error } = useFetch('http://localhost:3030/jsonstore/templates', null)

    const templates = data ? Object.values(data) : [];

    let content;

    if (isLoading) {
        content = Array(SKELETON_COUNT).fill(null).map((_, index) => (
            <TemplateCard key={index} temp={null} isLoading={true} />
        ));
    } else if (error) {
        content = <p className={styles.error}>Unable to fetch templates info. Please try again later.</p>;
    } else {
        content = templates.map(temp => (
            <TemplateCard temp={temp} key={temp.id} isLoading={false} />));
    }

    return (
        <div className={styles.templatesContainer}>
            <h2 className={styles.title}>Templates</h2>

            <div className={styles.templatesGrid}>
                {content}
            </div>
        </div>
    )
}