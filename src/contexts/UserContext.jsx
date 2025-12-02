import { createContext, useState } from "react";

const UserContext = createContext({
	user: {
		accessToken: "",
		email: "",
		password: "",
		_createdOn: 0,
		_id: "",
	},
	isAuthenticated: false,
	setAuthenticatedUser() {},
});

function UserProvider({ children }) {
	const [user, setUser] = useState({});

	const setAuthenticatedUser = (user) => {
		setUser(user);
	};

	const userContextValues = {
		user,
		isAuthenticated: !!user.accessToken,
		setAuthenticatedUser,
	};

	return (
		<UserContext.Provider value={userContextValues}>
			{children}
		</UserContext.Provider>
	);
}

export { UserContext, UserProvider };
