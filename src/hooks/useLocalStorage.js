import { useState, useEffect } from "react";

export default function useLocalStorage(initialState, key) {
	const [state, setState] = useState(() => {
		try {
			const storageData = localStorage.getItem(key);

			if (storageData) {
				return JSON.parse(storageData);
			}
		} catch (error) {
			console.error("Error reading from localStorage:", error);
		}

		return typeof initialState === "function" ? initialState() : initialState;
	});

	useEffect(() => {
		try {
			localStorage.setItem(key, JSON.stringify(state));
		} catch (error) {
			console.error("Error writing to localStorage:", error);
		}
	}, [state, key]);

	return [state, setState];
}
