import { useEffect, useState } from "react";

export default function useFetch(url, initialDataState, method, headers, body) {
	const [data, setData] = useState(initialDataState);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const controller = new AbortController();

		const fetchData = async () => {
			setIsLoading(true);
			setError(null);
			method.toUpperCase();
			try {
				const options = {
					method,
					headers,
					signal: controller.signal,
				};

				if (body && method !== "GET" && method !== "HEAD") {
					options.body = JSON.stringify(body);
					options.headers = {
						"Content-Type": "application/json",
						...headers,
					};
				}
				const res = await fetch(url, options);

				if (!res.ok) {
					const errorMessage = await res.text();
					setError(errorMessage);
					throw new Error(errorMessage);
				}

				const result = await res.json();
				setData(result);
				requestAnimationFrame(() => {
					setIsLoading(false);
				});
			} catch (error) {
				if (error.name === "AbortError") return;
				setError(error.message);
				requestAnimationFrame(() => {
					setIsLoading(false);
				});
			}
		};

		fetchData();

		return () => controller.abort();
	}, [url, body, headers, method]);

	return {
		data,
		isLoading,
		error,
	};
}
