import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./app/App.jsx";
import { UserProvider } from "./contexts/UserContext";

createRoot(document.getElementById("root")).render(
	<BrowserRouter>
		<StrictMode>
			<UserProvider>
				<App />
			</UserProvider>
		</StrictMode>
	</BrowserRouter>,
);
