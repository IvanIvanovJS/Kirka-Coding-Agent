import { AI_RULES } from '../config/aiRules';

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

const buildPrompt = (template, userRequest) => `${AI_RULES}

## USER REQUEST:
${userRequest}

## CURRENT TEMPLATE:
${JSON.stringify(template, null, 2)}

## YOUR RESPONSE:
Provide ONLY the JSON response as specified in the rules above. No additional text or markdown.`;

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

const validateModifiedTemplate = (modifiedTemplate, originalTemplate) => {
	validateTemplate(modifiedTemplate);

	const immutableFields = ['_id', '_ownerId'];

	immutableFields.forEach((field) => {
		if (modifiedTemplate[field] !== originalTemplate[field]) {
			console.warn(
				`Warning: AI modified immutable field '${field}', restoring original`,
			);
			modifiedTemplate[field] = originalTemplate[field];
		}
	});

	return modifiedTemplate;
};

const handleError = (error) => {
	if (error.name === 'AbortError') {
		return new Error('Request timed out. Please try again');
	}

	if (
		error.message?.includes('Failed to fetch') ||
		error.message?.includes('NetworkError')
	) {
		return new Error(
			'Unable to connect to AI service. Check your internet connection',
		);
	}

	if (
		error.message?.includes('API_KEY_INVALID') ||
		error.message?.includes('invalid API key')
	) {
		return new Error('API key is invalid or unauthorized');
	}

	if (
		error.message?.includes('RESOURCE_EXHAUSTED') ||
		error.message?.includes('429')
	) {
		return new Error('Too many requests. Please wait a moment and try again');
	}

	if (
		error.message?.includes('UNAVAILABLE') ||
		error.message?.includes('503')
	) {
		return new Error(
			'AI service is temporarily unavailable. Please try again later',
		);
	}

	return error instanceof Error
		? error
		: new Error('An unexpected error occurred. Please try again');
};

export {
	validateTemplate,
	validateUserRequest,
	extractJSON,
	parseResponse,
	validateModifiedTemplate,
	handleError,
	buildPrompt,
};
