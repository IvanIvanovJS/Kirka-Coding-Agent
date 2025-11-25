import { useEffect, useState } from "react";

export default function useFetch(url, initialState) {
    const [data, setData] = useState(initialState)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const controller = new AbortController();
        setIsLoading(true);
        setError(null);
        const fetchData = async () => {
            try {
                const res = await fetch(url, {
                    signal: controller.signal
                })

                if (!res.ok) {
                    const errorMessage = await res.text
                    setError(errorMessage)
                    throw new Error(errorMessage)
                }

                const result = await res.json()
                setData(result)
            } catch (error) {
                if (error.name === 'AbortError') return;
                setError(error.message)

            } finally {
                setIsLoading(false)
            }

        }

        fetchData()

        return () => controller.abort()
    }, [url])

    return {
        data,
        isLoading,
        error
    };
}