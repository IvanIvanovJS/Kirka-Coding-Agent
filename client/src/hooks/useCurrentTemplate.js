import { useEffect, useState } from 'react';
import useFetch from './useFetch';

export default function useCurrentTemplate(templateId) {
	const [currentTemplate, setCurrnetTemplate] = useState({});

	const { data, isLoading, error } = useFetch(
		`http://localhost:3030/data/templates/${templateId}`,
		null,
		'GET',
	);

	useEffect(() => {
		setCurrnetTemplate(data);
	}, [data]);

	return {
		currentTemplate,
		isLoading,
		error,
		setCurrnetTemplate,
	};
}
