import { createContext } from "react";

const UserContext = createContext({
	user: {
		accessToken: "",
		email: "",
		password: "",
		_createdOn: 0,
		_id: "",
	},
	isAuthenticated: false,
});

export default UserContext;
