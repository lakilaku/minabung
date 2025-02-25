import { useContext, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ImageBackground } from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import { gql, useMutation } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { saveSecure } from '../utils/SecureStore';
import Modal from 'react-native-modal';

const LOGIN = gql`
    mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
            accessToken
        }
    }
`

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { setIsSignedIn } = useContext(AuthContext);
    const [loginAccess, { loading }] = useMutation(LOGIN);

    const navigation = useNavigation();

    const [isModalVisible, setIsModalVisible] = useState(false);

    const handleSubmitLogin = async () => {
        try {
            const result = await loginAccess({
                variables: {
                    username,
                    password,
                }
            });
            const accessToken = result.data.login.accessToken;
            await saveSecure('accessToken', accessToken);
            setIsSignedIn(true);
            setIsModalVisible(false); 
        } catch (error) {
            console.log(error.message);
            Alert.alert('Error!', error.message);
        }
    };

    return (
        <ImageBackground
            source={{uri: (`https://image.pollinations.ai/prompt/family-finance berupa chart dan uang?width=800&height=800&nologo=true`)}}
            style={styles.background}
        >
            <View style={styles.container}>
                <Text style={styles.title}>Family Finance</Text>

                <View style={styles.overlay}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => setIsModalVisible(true)} 
                    >
                        <Text style={styles.buttonText}>Login</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Modal
                isVisible={isModalVisible}
                onBackdropPress={() => setIsModalVisible(false)} 
                onBackButtonPress={() => setIsModalVisible(false)}
                animationIn="slideInUp" 
                animationOut="slideOutDown" 
                backdropOpacity={0.5} 
                useNativeDriver
                style={styles.modalStyle} 
            >
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Minabung</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        onChangeText={setUsername}
                        value={username}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        onChangeText={setPassword}
                        value={password}
                        secureTextEntry={true}
                    />

                    {loading ? (
                        <ActivityIndicator size="large" color="#0077B5" />
                    ) : (
                        <Button title="Login" onPress={handleSubmitLogin} color="#0077B5" />
                    )}

                    <Text style={styles.text}>Don't have an account?</Text>
                    <TouchableOpacity
                        onPress={() => {
                            navigation.navigate('Register');
                        }}
                    >
                        <Text style={styles.text}>Register</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    container: {
        flex: 1,
        justifyContent: 'space-between', 
        width: '100%',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
        marginTop: 50, 
    },
    overlay: {
        justifyContent: 'flex-end',
        width: '100%', 
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    button: {
        backgroundColor: "#0077B5",
        paddingVertical: 15, 
        borderRadius: 25,
        width: '100%', 
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 18, 
        textAlign: 'center',
    },
    text: {
        textAlign: 'center',
        marginTop: 15,
        color: '#000',
    },
    modalStyle: {
        margin: 0, 
        justifyContent: 'flex-end', 
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        padding: 20,
        width: '100%',
        maxHeight: 400, 
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
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
