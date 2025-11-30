import { useState } from "react";

export default function useForm(callback, initialValues) {
	const [values, setValues] = useState(initialValues);

	const onChangeHandler = (e) => {
		setValues((state) => ({
			...state,
			[e.target.name]: e.target.value,
		}));
	};

	const formAction = async (formData) => {
		await callback(values, formData);
	};

	return {
		values,
		onChangeHandler,
		formAction,
	};
}
