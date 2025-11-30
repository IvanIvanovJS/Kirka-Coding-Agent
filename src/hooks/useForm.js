import { useState } from "react";

export default function useForm(callback, initialValues) {
	const [values, setValues] = useState(initialValues);

	const onChangeHandler = (e) => {
		setValues((state) => ({
			...state,
			[e.target.name]: e.target.value,
		}));
	};

	const input = (fieldName) => {
		return {
			name: fieldName,
			onChange: onChangeHandler,
			value: values[fieldName],
		};
	};

	const formAction = async (formData) => {
		try {
			await callback(values, formData);
		} catch (error) {
			console.error("Form submission failed:", error.message);
		}
	};

	return {
		input,
		values,
		onChangeHandler,
		formAction,
		setValues,
	};
}
