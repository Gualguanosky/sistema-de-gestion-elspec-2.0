import { useState, useEffect } from 'react';
import db from '../services/db';

const useAuth = () => {
    const [user, setUser] = useState(() => db.getSession());
    const [users, setUsers] = useState([]);

    // Listen for Auth Changes
    useEffect(() => {
        const unsubscribe = db.onAuthStateChanged((firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                db.setSession(firebaseUser);
            } else {
                db.clearSession();
            }
        });
        return () => unsubscribe();
    }, []);

    // Also listen for users collection changes (for admin management)
    useEffect(() => {
        const unsubscribe = db.subscribeUsers((updatedUsers) => {
            setUsers(updatedUsers);
        });
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    const login = async (username, password) => {
        // Now loginUser returns the user object (legacy or migrated)
        // AND sets the Auth state if successful (handled by onAuthStateChanged)
        const userFound = await db.loginUser(username, password);
        return !!userFound;
    };

    const logout = async () => {
        await db.logout();
        setUser(null);
    };

    const addUser = (userData) => {
        // TODO: In a real app, this should also create an Auth user (maybe via Cloud Function)
        // For now, we just create the DB entry, and let the "Migration" logic handle Auth creation on first login.
        return db.addUser(userData);
    };

    const deleteUser = (userId) => {
        return db.deleteUser(userId);
    };

    const updateUser = (userId, data) => {
        return db.updateUser(userId, data);
    };

    return { user, users, login, logout, addUser, deleteUser, updateUser, isAuthenticated: !!user };
};

export default useAuth;
