import { createContext, useState } from 'react';
import useFetch from '../hooks/useFetch';

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
});

function AgentAppProvider({ children }) {
	const [isSidebarVisible, setIsSidebarVisible] = useState(true);
	const [currentTemplate, setCurrentTemplate] = useState(null);
	const [previewMode, setPreviewMode] = useState('desktop');

	const {
		data: templates,
		isLoading,
		error: serverError,
	} = useFetch('http://localhost:3030/data/templates', {}, 'GET');
	const toggleSidebar = () => {
		setIsSidebarVisible((state) => !state);
	};

	const handleSetPreviewMode = (mode) => {
		setPreviewMode(mode);
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
	};

	return (
		<AgentAppContext.Provider value={agentAppContextValues}>
			{children}
		</AgentAppContext.Provider>
	);
}

export { AgentAppContext, AgentAppProvider };
