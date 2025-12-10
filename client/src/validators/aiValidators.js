import { AI_RULES } from '../config/aiRules';

const validateTemplate = (template) => {
	if (!template || typeof template !== 'object') {
		throw new Error('Invalid template: must be an object');
	}

	const requiredFields = [
		'_id',
		'name',
		'_ownerId',
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
IMPORTANT: output valid JSON only. Start your response with '{' and end with '}'. Do not use Markdown code blocks.`;

const extractJSON = (text) => {
    if (!text) return "";

	let cleanText = text.replace(/`/g, "");

    const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
        cleanText = markdownMatch[1];
    }

    const firstOpen = cleanText.indexOf('{');
    const lastClose = cleanText.lastIndexOf('}');

    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        return cleanText.substring(firstOpen, lastClose + 1);
    }

    return cleanText.trim();
};

const parseResponse = (responseText) => {
    if (!responseText) {
        throw new Error('AI returned empty response');
    }

    const jsonText = extractJSON(responseText);

    try {
        const parsed = JSON.parse(jsonText);

        if (!parsed.modifiedTemplate || !parsed.message) {
          
            if (parsed._id && parsed.sections) {
                 return {
                    modifiedTemplate: parsed,
                    message: "Template updated successfully.",
                    changedSections: []
                 };
            }
            throw new Error('AI response structure is incorrect (missing modifiedTemplate or message)');
        }

        return {
            modifiedTemplate: parsed.modifiedTemplate,
            message: parsed.message,
            changedSections: parsed.changedSections || [],
        };

    } catch  {
        console.error('Failed to parse JSON:', jsonText.substring(0, 200) + '...');
        throw new Error('AI returned invalid JSON format. Please try your request again.');
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
