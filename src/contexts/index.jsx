import { useContext } from 'react';
import { AgentAppContext } from './AgentAppContext';

function useAgentApp() {
	const context = useContext(AgentAppContext);

	if (context === undefined) {
		throw new Error('useAgentApp must be used within a AgentAppProvider');
	}

	return context;
}

function useUser() {
	const context = useContext(AgentAppContext);

	if (context === undefined) {
		throw new Error('useUser must be used within a UserProvider');
	}

	return context;
}

export { useAgentApp, useUser };
