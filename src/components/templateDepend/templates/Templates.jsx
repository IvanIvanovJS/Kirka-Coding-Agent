import { useLocation } from 'react-router';
import useFetch from '../../../hooks/useFetch';
import TemplateCard from '../templateCard/TemplateCard';
import styles from './Templates.module.css';
import { useUser } from '../../../contexts';

const SKELETON_COUNT = 4;
const BASE_URL = 'http://localhost:3030/data';

export default function Templates() {
	const location = useLocation();
	const isMyTemplates = location.pathname.includes('/my-templates');
	const { user, isAuthenticated } = useUser();
	const url =
		isMyTemplates && isAuthenticated ? `/user-${user._id}` : '/templates';
	const fullUrl = BASE_URL + url;
	const { data, isLoading, error } = useFetch(fullUrl, null, 'GET');

	const templates = data ? Object.values(data) : [];
	let content;

	if (isLoading) {
		content = Array(SKELETON_COUNT)
			.fill(null)
			.map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: <Array length is a constant>
				<TemplateCard key={index} temp={null} isLoading={true} />
			));
	} else if (error) {
		content = (
			<p className={styles.error}>
				Unable to fetch templates info. Please try again later.
			</p>
		);
	} else if (templates.length > 0) {
		content = templates.map((temp) => (
			<TemplateCard temp={temp} url={url} key={temp._id} isLoading={false} />
		));
	} else {
		content = <p>No templates found.</p>;
	}

	return (
		<div className={styles.templatesContainer}>
			<h2 className={styles.title}>Templates</h2>

			<div className={styles.templatesGrid}>{content}</div>
		</div>
	);
}
