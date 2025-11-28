import { useEffect, useState } from "react";

export default function useFetch(url, initialDataState) {
	const [data, setData] = useState(initialDataState);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const controller = new AbortController();

		const fetchData = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const res = await fetch(url, {
					signal: controller.signal,
				});

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
	}, [url]);

	return {
		data,
		isLoading,
		error,
	};
}
