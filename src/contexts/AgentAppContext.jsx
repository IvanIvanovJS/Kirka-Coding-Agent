import { createContext, useState } from 'react';

const AgentAppContext = createContext({
	isSidebarVisible: true,
	toggleSidebar() {},
});

function AgentAppProvider({ children }) {
	const [isSidebarVisible, setIsSidebarVisible] = useState(true);

	const toggleSidebar = () => {
		setIsSidebarVisible((state) => !state);
	};

	const agentAppContextValues = {
		isSidebarVisible,
		toggleSidebar,
	};

	return (
		<AgentAppContext.Provider value={agentAppContextValues}>
			{children}
		</AgentAppContext.Provider>
	);
}

export { AgentAppContext, AgentAppProvider };
