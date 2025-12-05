import { useCallback, useEffect, useState } from 'react';

export default function useFetch(
	url,
	initialDataState,
	method,
	headers,
	body,
	autoFetch = true,
) {
	const [data, setData] = useState(initialDataState);
	const [isLoading, setIsLoading] = useState(autoFetch);
	const [error, setError] = useState(null);
	const safeMethod = method ? method.toUpperCase() : 'GET';

	const stringifiedBody = JSON.stringify(body);
	const stringifiedHeaders = JSON.stringify(headers);

	const executeFetch = useCallback(
		async (customBody = null, customHeaders = null) => {
			const controller = new AbortController();

			const bodyToUse =
				customBody !== null ? JSON.stringify(customBody) : stringifiedBody;
			const headersToUse =
				customHeaders !== null
					? JSON.stringify(customHeaders)
					: stringifiedHeaders;

			if (
				safeMethod !== 'GET' &&
				safeMethod !== 'HEAD' &&
				bodyToUse === 'null'
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
					headersToUse && headersToUse !== 'null'
						? JSON.parse(headersToUse)
						: {};

				if (
					headersToUse !== 'null' &&
					bodyToUse !== 'null' &&
					safeMethod !== 'GET' &&
					safeMethod !== 'HEAD'
				) {
					options.body = bodyToUse;
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
					setIsLoading(false);
					return res;
				}
				const result = await res.json();
				setData(result);

				requestAnimationFrame(() => {
					setIsLoading(false);
				});

				return result;
			} catch (error) {
				if (error.name === 'AbortError') return;
				setError(error.message);
				requestAnimationFrame(() => {
					setIsLoading(false);
				});
				throw error;
			}
		},
		[url, stringifiedHeaders, stringifiedBody, safeMethod],
	);

	useEffect(() => {
		if (!autoFetch) return;

		const controller = new AbortController();
		executeFetch();
		return () => controller.abort();
	}, [autoFetch, executeFetch]);

	return {
		data,
		isLoading,
		error,
		setError,
		refetch: executeFetch,
	};
}
