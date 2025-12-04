import ReactDOM from 'react-dom';

export default function PreviewModalPortal({ children }) {
	const agentRoot = document.getElementById('agent-app');

	return ReactDOM.createPortal(<div>{children}</div>, agentRoot);
}
