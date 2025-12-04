import { Route, Routes, useLocation } from 'react-router';
import Footer from '../components/layout/footer/Footer';
import Header from '../components/layout/header/Header';
import Hero from '../components/hero/Hero';
import styles from './App.module.css';
import Login from '../components/auth/login/Login';
import Register from '../components/auth/register/Register';
import Templates from '../components/templateDepend/templates/Templates';
import TemplateDetails from '../components/templateDepend/templateDetails/TemplateDetails';
import Logout from '../components/auth/logout/Logout';
import AuthGuard from '../routeGuards/AuthGuard';
import GuestGuard from '../routeGuards/GuestGuard';
import AgentApp from '../components/agentApp/AgentApp';
import { AgentAppProvider } from '../contexts/AgentAppContext';

function App() {
	const location = useLocation();

	const isLayoutless =
		(location.pathname.includes('/templates/') &&
			location.pathname.endsWith('/details')) ||
		location.pathname.includes('/agent-app');

	const shouldRenderLayout = !isLayoutless;

	return (
		<>
			{isLayoutless && (
				<Routes>
					<Route
						path="/templates/:templateId/details"
						element={<TemplateDetails />}
					/>
					<AgentAppProvider>
						<Route path="/agent-app" element={<AgentApp />} />
					</AgentAppProvider>
				</Routes>
			)}

			{shouldRenderLayout && (
				<div className={styles.layoutWrapper}>
					<Header />
					<main className={styles.mainContent}>
						<Routes>
							<Route path="/" element={<Hero />} />
							<Route path="/templates">
								<Route index element={<Templates />} />
							</Route>

							<Route path="/auth">
								<Route
									path="login"
									element={
										<GuestGuard>
											<Login />
										</GuestGuard>
									}
								/>
								<Route
									path="register"
									element={
										<GuestGuard>
											<Register />
										</GuestGuard>
									}
								/>
								<Route
									path="logout"
									element={
										<AuthGuard>
											<Logout />
										</AuthGuard>
									}
								/>
							</Route>
						</Routes>
					</main>

					<Footer />
				</div>
			)}
		</>
	);
}

export default App;
