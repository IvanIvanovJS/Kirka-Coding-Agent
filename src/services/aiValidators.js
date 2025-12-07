const validateTemplate = (template) => {
	if (!template || typeof template !== 'object') {
		throw new Error('Invalid template: must be an object');
	}

	const requiredFields = [
		'id',
		'name',
		'description',
		'category',
		'bodyClass',
		'config',
		'sections',
		'full_html_template',
	];

	const missingField = requiredFields.find((field) => !(field in template));

	if (missingField) {
		throw new Error(
			`Invalid template: missing required field '${missingField}'`,
		);
	}

	if (
		!template.config?.colors?.primary ||
		!template.config?.colors?.background
	) {
		throw new Error('Invalid template: missing color configuration');
	}
	if (!template.sections || typeof template.sections !== 'object') {
		throw new Error('Invalid template: sections must be an object');
	}

	return template;
};

const validateUserRequest = (userRequest) => {
	if (
		!userRequest ||
		typeof userRequest !== 'string' ||
		userRequest.trim().length === 0
	) {
		throw new Error('Invalid user request: must be a non-empty string');
	}

	if (userRequest.length > 5000) {
		throw new Error('Invalid user request: too long (max 5000 characters)');
	}

	return userRequest;
};

const extractJSON = (text) => {
	const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
	return jsonMatch ? jsonMatch[1].trim() : text.trim();
};

const parseResponse = (responseText) => {
	if (!responseText) {
		throw new Error('AI returned empty response');
	}

	try {
		const jsonText = extractJSON(responseText);
		const parsed = JSON.parse(jsonText);

		if (!parsed.modifiedTemplate || !parsed.message) {
			throw new Error('AI response missing required fields');
		}

		return {
			modifiedTemplate: parsed.modifiedTemplate,
			message: parsed.message,
			changedSections: parsed.changedSections || [],
		};
	} catch {
		console.error(
			'Failed to parse AI response:',
			responseText.substring(0, 500),
		);
		throw new Error('AI returned invalid JSON response');
	}
};
