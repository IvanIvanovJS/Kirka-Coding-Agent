function convertEpochToDate(epochTime) {
	let dateInput = epochTime;
	if (String(epochTime).length === 10) {
		dateInput = epochTime * 1000;
	}

	return new Date(dateInput);
}

export default function formatEpoch(epochTime, locale = 'en-US') {
	const dateObject = convertEpochToDate(epochTime);

	const defaultOptions = {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	};

	return dateObject.toLocaleString(locale, defaultOptions);
}
