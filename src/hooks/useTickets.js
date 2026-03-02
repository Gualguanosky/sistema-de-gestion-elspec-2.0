import { useState, useEffect } from 'react';
import db from '../services/db';

const useTickets = () => {
    const [tickets, setTickets] = useState([]);

    useEffect(() => {
        const unsubscribe = db.subscribeTickets((updatedTickets) => {
            setTickets(updatedTickets);
        });
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    const addTicket = (ticketData) => {
        return db.addTicket(ticketData);
    };

    const updateTicketStatus = (id, status, extraData = {}) => {
        return db.updateTicket(id, { status, ...extraData });
    };

    const deleteTicket = (id) => {
        return db.deleteTicket(id);
    };

    return { tickets, addTicket, updateTicketStatus, deleteTicket };
};

export default useTickets;
