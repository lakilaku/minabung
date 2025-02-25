import { gql, useMutation } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';


const REGISTER = gql`
    mutation Register($name: String!, $username: String!, $email: String!, $password: String!) {
        register(name: $name, username: $username, email: $email, password: $password) {
            name
            _id
            email
        }
    }
`
export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigation = useNavigation(); 

    const [register, { loading, error }] = useMutation(REGISTER, {
        onCompleted: () => {
            navigation.navigate('Login');
        },
        onError: (err) => {
            Alert.alert('Registration Failed', err.message);
        }
    });

    const handleRegister = async () => {
        if (!name || !username || !email || !password) {
            Alert.alert('Validation Error', 'Please fill all fields');
            return;
        }
        
        try {
            await register({ variables: { name, username, email, password } });
        } catch (err) {
            console.error(err);
        }
    };
    return (
        <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>

        <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
        />

        <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
        />

        <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
        />

        <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
        />

        <Button 
            title={loading ? 'Registering...' : 'Register'}
            color="#0077B5" 
            onPress={handleRegister}
            disabled={loading}
        />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f4f4f4',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    input: {
        width: '100%',
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 15,
        paddingLeft: 10,
        fontSize: 16,
    },
});
