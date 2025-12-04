import useFetch from '../../hooks/useFetch';
import styles from './AgentApp.module.css';
import ChatPanel from './chatPanel/ChatPanel';
import PreviewPanel from './previewPanel/PreviewPanel';
import TemplatesSidebar from './sidebar/TemplatesSidebar';


export default function AgentApp() {

	const {data, isLoading, error} = useFetch('http://localhost:3030/data/templates', {},'GET')



	return (
		<div className={styles.agentApp}>
			<TemplatesSidebar isLoading={isLoading} templates={data} error={error}/>

			<ChatPanel />

			<PreviewPanel />
		</div>
	);
}
