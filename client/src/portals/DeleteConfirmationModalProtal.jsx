import ReactDOM from 'react-dom';

export default function DeleteConfirmationModalPortal({ children }) {
	const detailsRoot = document.getElementById('details');

	return ReactDOM.createPortal(<div>{children}</div>, detailsRoot);
}
