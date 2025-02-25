import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { deleteSecure } from '../utils/SecureStore';
import { AuthContext } from '../contexts/AuthContext';

const HomeScreen = () => {
    const { setIsSignedIn } = useContext(AuthContext);
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Family Finance App!</Text>
            <Text style={styles.subTitle}>Here you can manage your family's budget.</Text>
            <TouchableOpacity
                style={{
                    borderRadius: 20,
                    backgroundColor: "#f52d56",
                    paddingHorizontal: 15,
                    paddingVertical: 5,
                }}
                onPress={ async () => {
                    await deleteSecure('accessToken');
                    setIsSignedIn(false);
                }} 
            >
                <Text style={{ color: "white" }}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F4F6F7',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 18,
    color: '#7F8C8D',
  },
});

export default HomeScreen;
