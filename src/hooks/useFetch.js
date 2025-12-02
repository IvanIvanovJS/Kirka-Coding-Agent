import { useEffect, useState } from 'react';

export default function useFetch(url, initialDataState, method, headers, body) {
	const [data, setData] = useState(initialDataState);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const safeMethod = method ? method.toUpperCase() : 'GET';

	const stringifiedBody = JSON.stringify(body);
	const stringifiedHeaders = JSON.stringify(headers);

	useEffect(() => {
		const controller = new AbortController();

		const fetchData = async () => {
			if (
				safeMethod !== 'GET' &&
				safeMethod !== 'HEAD' &&
				stringifiedBody === 'null'
			) {
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			setError(null);
			try {
				const options = {
					method: safeMethod,
					headers: {},
					signal: controller.signal,
				};

				const parsedHeaders =
					stringifiedHeaders && stringifiedHeaders !== 'null'
						? JSON.parse(stringifiedHeaders)
						: {};

				if (
					stringifiedHeaders !== 'null' &&
					stringifiedBody !== 'null' &&
					safeMethod !== 'GET' &&
					safeMethod !== 'HEAD'
				) {
					options.body = stringifiedBody;
					options.headers = {
						...parsedHeaders,
						'Content-Type': 'application/json',
					};
				}

				if (parsedHeaders?.['X-Authorization']) {
					options.headers = {
						...options.headers,
						...parsedHeaders,
					};
				}

				const res = await fetch(url, options);

				if (!res.ok) {
					const error = await res.text();
					const result = JSON.parse(error);
					setError(result.message);
					throw new Error(result.message);
				}
				if (res.status === 204) {
					return res;
				}
				const result = await res.json();
				setData(result);

				requestAnimationFrame(() => {
					setIsLoading(false);
				});
			} catch (error) {
				if (error.name === 'AbortError') return;
				setError(error.message);
				requestAnimationFrame(() => {
					setIsLoading(false);
				});
			}
		};

		fetchData();

		return () => controller.abort();
	}, [url, stringifiedHeaders, stringifiedBody, safeMethod]);

	return {
		data,
		isLoading,
		error,
		setError,
	};
}
