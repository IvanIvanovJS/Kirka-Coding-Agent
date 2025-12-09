import { createContext, useState } from 'react';
import useFetch from '../hooks/useFetch';
import AIService from '../services/aiService';
import { useUser } from '.';

const AgentAppContext = createContext({
	isSidebarVisible: true,
	toggleSidebar() {},
	templates: [],
	isLoading: true,
	serverError: null,
	currentTemplate: null,
	setCurrentTemplate() {},
	previewMode: 'desktop',
	handleSetPreviewMode() {},
	messages: [],
	isAiProcessing: false,
	sendMessage: async () => {},
	aiError: null,
	isOwner: false,
	templateViewMode: 'templates',
	handleSetTemplateViewMode() {},
	myTemplates: [],
	isLoadingMyTemplates: true,
	myTemplatesError: null,
	refechMyTemplates: async () => {},
});

function AgentAppProvider({ children }) {
	const [isSidebarVisible, setIsSidebarVisible] = useState(true);
	const [currentTemplate, setCurrentTemplate] = useState(null);
	const [previewMode, setPreviewMode] = useState('desktop');
	const [templateViewMode, setTemplateViewMode] = useState('templates');
	const [messages, setMessages] = useState([]);
	const [isAiProcessing, setIsAiProcessing] = useState(false);
	const [aiError, setAiError] = useState(null);
	const { user, isAuthenticated } = useUser();
	const isOwner = user?._id === currentTemplate?._ownerId;

	const {
		data: templates,
		isLoading,
		error: serverError,
	} = useFetch('http://localhost:3030/data/templates', {}, 'GET');

	const myTemplatesUrl =
		isAuthenticated && user?._id
			? `http://localhost:3030/data/user-${user?._id}`
			: null;

	const {
		data: myTemplates,
		isLoading: isLoadingMyTemplates,
		error: myTemplatesError,
		refetch: refechMyTemplates,
	} = useFetch(myTemplatesUrl, {}, 'GET', null, null, !!myTemplatesUrl);

	const toggleSidebar = () => {
		setIsSidebarVisible((state) => !state);
	};

	const handleSetPreviewMode = (mode) => {
		setPreviewMode(mode);
	};

	const handleSetTemplateViewMode = (mode) => {
		setTemplateViewMode(mode);
	};

	const sendMessage = async (content) => {
		if (!currentTemplate) {
			setAiError(new Error('Please select a template first'));
			return;
		}

		if (!content || content.trim().length === 0) {
			return;
		}

		if (isAiProcessing) {
			return;
		}

		try {
			setAiError(null);
			setIsAiProcessing(true);

			const userMessage = {
				id: `user-${Date.now()}`,
				content: content.trim(),
				isUser: true,
				timestamp: Date.now(),
			};

			setMessages((prev) => [...prev, userMessage]);

			const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
			if (!apiKey) {
				throw new Error('API key is not configured');
			}

			const aiService = new AIService(apiKey);

			const result = await aiService.editTemplate(
				{ ...currentTemplate, _ownerId: user?._id },
				content,
				user?._id,
			);
			setCurrentTemplate(result.modifiedTemplate);

			const aiMessage = {
				id: `ai-${Date.now()}`,
				content: result.message,
				isUser: false,
				timestamp: Date.now(),
				templateSnapshot: result.modifiedTemplate,
			};

			setMessages((prev) => [...prev, aiMessage]);
		} catch (error) {
			setAiError(error);

			const errorMessage = {
				id: `error-${Date.now()}`,
				content: `Error: ${error.message}`,
				isUser: false,
				timestamp: Date.now(),
				isError: true,
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsAiProcessing(false);
		}
	};

	const agentAppContextValues = {
		isSidebarVisible,
		toggleSidebar,
		templates,
		isLoading,
		serverError,
		currentTemplate,
		setCurrentTemplate,
		previewMode,
		handleSetPreviewMode,
		messages,
		isAiProcessing,
		sendMessage,
		aiError,
		isOwner,
		handleSetTemplateViewMode,
		templateViewMode,
		myTemplates,
		isLoadingMyTemplates,
		myTemplatesError,
		refechMyTemplates,
	};

	return (
		<AgentAppContext.Provider value={agentAppContextValues}>
			{children}
		</AgentAppContext.Provider>
	);
}

export { AgentAppContext, AgentAppProvider };
