import { useState, useEffect } from 'react';
import db from '../services/db';

const useIndicators = () => {
    const [indicators, setIndicators] = useState([]);

    useEffect(() => {
        const unsubscribe = db.subscribeIndicators((updatedIndicators) => {
            setIndicators(updatedIndicators);
        });
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    const addIndicator = (indicatorData) => {
        return db.addIndicator(indicatorData);
    };

    const deleteIndicator = (id) => {
        return db.deleteIndicator(id);
    };

    return { indicators, addIndicator, deleteIndicator };
};

export default useIndicators;
