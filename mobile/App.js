import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootStack from './navigators/RootStack';
import { ApolloProvider } from '@apollo/client';
import client from './config/apollo';
import AuthProvider from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <ApolloProvider client={client}>
        <NavigationContainer>
          <RootStack />
          {/* <TabNavigator /> */}
        </NavigationContainer>
      </ApolloProvider>
    </AuthProvider>
  );
}