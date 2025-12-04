import { createContext,  useState } from 'react';
import useFetch from '../hooks/useFetch';


const AgentAppContext = createContext({
	isSidebarVisible: true,
	toggleSidebar() {},
	templates: [],
	isLoading: true,
	serverError: null,
	currentTemplate: null,
	setCurrentTemplate() {},
});


function AgentAppProvider({ children }) {
	const [isSidebarVisible, setIsSidebarVisible] = useState(true);
	const [currentTemplate, setCurrentTemplate] = useState(null)
	
	const {
		data: templates,
		isLoading,
		error: serverError,
	} = useFetch('http://localhost:3030/data/templates', {}, 'GET');
	const toggleSidebar = () => {
		setIsSidebarVisible((state) => !state);
	};

	
	const agentAppContextValues = {
		isSidebarVisible,
		toggleSidebar,
		templates,
		isLoading,
		serverError,
		currentTemplate,
		setCurrentTemplate,
	};

	return (
		<AgentAppContext.Provider value={agentAppContextValues}>
			{children}
		</AgentAppContext.Provider>
	);
}

export { AgentAppContext, AgentAppProvider };
