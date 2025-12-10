import { GoogleGenAI } from '@google/genai';
import {
	buildPrompt,
	handleError,
	parseResponse,
	validateModifiedTemplate,
	validateTemplate,
	validateUserRequest,
} from '../validators/aiValidators';

class AIService {
	constructor(apiKey) {
		if (!apiKey) {
			throw new Error('API key is required for AIService');
		}
		this.ai = new GoogleGenAI({ apiKey });
		this.timeout = 30000;
	}

	async editTemplate(template, userRequest) {
		try {
			console.log(template);
			validateTemplate(template);
			validateUserRequest(userRequest);

			const prompt = buildPrompt(template, userRequest);

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			try {
				const response = await this.ai.models.generateContent({
					model: 'gemini-2.5-flash',
					generationConfig: {
						temperature: 0.2,
						topK: 40,
						topP: 0.95,
					},
					contents: prompt,
				});

				clearTimeout(timeoutId);
				const result = parseResponse(response.text);
				result.modifiedTemplate = validateModifiedTemplate(
					result.modifiedTemplate,
					template,
				);

				return result;
			} catch (error) {
				clearTimeout(timeoutId);
				throw error;
			}
		} catch (error) {
			throw handleError(error);
		}
	}
}

export default AIService;
