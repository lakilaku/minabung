const { createNativeStackNavigator } = require("@react-navigation/native-stack");
import LoginScreen from "../screens/LoginScreen";
import { Text, View } from 'react-native';
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import RegisterScreen from "../screens/RegisterScreen";
import { getSecure } from "../utils/SecureStore";
import HomeScreen from "../screens/HomeScreen";

const Stack = createNativeStackNavigator();

export default function RootStack() {
    const {isSignedIn, setIsSignedIn} = useContext(AuthContext);
    const [loading, setLoading] = useState(true);

    useEffect(() => {   
        async function checkAuth() {
            const accessToken = await getSecure('accessToken');
            if (accessToken) {
                setIsSignedIn(true);
            }
            setLoading(false);
        }
        checkAuth();
    }, []);

    if(loading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                backgroundColor: '#0077B5',
                },
                headerTintColor: '#fff',
            }}
        >
        {isSignedIn ? (
            <>
                <Stack.Screen 
                    name="Home" 
                    component={HomeScreen}
                    options={{ 
                        title: 'Overview', 
                        headerShown: false 
                    }}
                />
            
            </>

        ) : (
            <>
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ title: 'Login' }}
                />
                <Stack.Screen
                    name="Register"
                    component={RegisterScreen}
                    options={{ title: 'Register' }}
                />
            </>
        )}
        </Stack.Navigator>
                
    );
}