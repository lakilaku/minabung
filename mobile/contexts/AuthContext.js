import { createContext, useState } from "react";


export const AuthContext = createContext(null);

export default function AuthProvider ({ children }) {
    const [isSignedIn, setIsSignedIn ] = useState(false);
    // console.log(isSignedIn, setIsSignedIn);
    

    return  <AuthContext.Provider
                value={{ isSignedIn, setIsSignedIn }}
            >
                {children}
            </AuthContext.Provider>;
}