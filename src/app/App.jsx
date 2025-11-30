import { Route, Routes, useLocation } from "react-router";
import Footer from "../components/layout/footer/Footer";
import Header from "../components/layout/header/Header";
import Hero from "../components/hero/Hero";
import styles from "./App.module.css";
import Login from "../components/auth/login/Login";
import Register from "../components/auth/register/Register";
import Templates from "../components/templateDepend/templates/Templates";
import TemplateDetails from "../components/templateDepend/templateDetails/TemplateDetails";
import { useState } from "react";
import UserContext from "../contexts/UserContext";

function App() {
	const [user, setUser] = useState({});
	const location = useLocation();

	const isDetails =
		location.pathname.includes("/templates/") &&
		location.pathname.endsWith("/details");

	const shouldRenderLayout = !isDetails;

	const setAuthenticatedUser = (user) => {
		setUser(user);
	};

	const userContextValues = {
		user,
		isAuthenticated: !!user.accessToken,
	};

	return (
		<UserContext.Provider value={userContextValues}>
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
								<Route
									path="register"
									element={
										<Register setAuthenticatedUser={setAuthenticatedUser} />
									}
								/>
							</Route>
						</Routes>
					</main>

					<Footer />
				</div>
			)}
		</UserContext.Provider>
	);
}

export default App;
