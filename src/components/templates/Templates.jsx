import useFetch from '../../hooks/useFetch';
import TemplateCard from '../templateCard/TemplateCard';
import styles from './Templates.module.css';

export default function Templates() {

    const { data, isLoading, error } = useFetch('http://localhost:3030/jsonstore/templates', {})

    const templates = Object.values(data);

    return (
        <div className={styles.templatesContainer}>
            <h2 className={styles.title}>Templates</h2>

            <div className={styles.templatesGrid}>
                {templates.map(temp => <TemplateCard temp={temp} />)}
            </div>
        </div>

    )
}