import * as SecureStore from 'expo-secure-store';

export const saveSecure = async (key, value) => {   
    try {
        await SecureStore.setItemAsync(key, value);
    }
    catch (error) {
        console.error(error);
    }
};

export const getSecure = async (key) => {   
    try {
        return await SecureStore.getItemAsync(key);
    }
    catch (error) {
        console.error(error);
    }
};

export const deleteSecure = async (key) => {   
    try {
        await SecureStore.deleteItemAsync(key);
    }
    catch (error) {
        console.error(error);
    }
};