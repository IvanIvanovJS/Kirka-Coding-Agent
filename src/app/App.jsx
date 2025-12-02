import { Route, Routes, useLocation } from "react-router";
import Footer from "../components/layout/footer/Footer";
import Header from "../components/layout/header/Header";
import Hero from "../components/hero/Hero";
import styles from "./App.module.css";
import Login from "../components/auth/login/Login";
import Register from "../components/auth/register/Register";
import Templates from "../components/templateDepend/templates/Templates";
import TemplateDetails from "../components/templateDepend/templateDetails/TemplateDetails";
import Logout from "../components/auth/logout/Logout";

function App() {
	const location = useLocation();

	const isDetails =
		location.pathname.includes("/templates/") &&
		location.pathname.endsWith("/details");

	const shouldRenderLayout = !isDetails;

	return (
		<>
			{isDetails && (
				<Routes>
					<Route
						path="/templates/:templateId/details"
						element={<TemplateDetails />}
					/>
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
								<Route path="login" element={<Login />} />
								<Route path="register" element={<Register />} />
								<Route path="logout" element={<Logout />} />
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
