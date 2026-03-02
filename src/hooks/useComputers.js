import { useState, useEffect } from 'react';
import db from '../services/db';

const useComputers = () => {
    const [computers, setComputers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = db.subscribeComputers((updatedComputers) => {
            setComputers(updatedComputers);
            setLoading(false);
        });
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    const addComputer = (computerData) => {
        return db.addComputer(computerData);
    };

    const updateComputer = (id, data) => {
        return db.updateComputer(id, data);
    };

    const deleteComputer = (id) => {
        return db.deleteComputer(id);
    };

    const addMaintenanceLog = (computerId, logEntry) => {
        // Fetch current computer to append log
        const computer = computers.find(c => c.id === computerId);
        if (computer) {
            const newLog = [
                ...(computer.maintenanceLog || []),
                { ...logEntry, createdAt: new Date().toISOString() }
            ];
            return updateComputer(computerId, { maintenanceLog: newLog });
        }
    };

    const addSupportLog = (computerId, logEntry) => {
        const computer = computers.find(c => c.id === computerId);
        if (computer) {
            const newLog = [
                ...(computer.supportLog || []),
                { ...logEntry, createdAt: new Date().toISOString() }
            ];
            return updateComputer(computerId, { supportLog: newLog });
        }
    };

    return { computers, loading, addComputer, updateComputer, deleteComputer, addMaintenanceLog, addSupportLog };
};

export default useComputers;
