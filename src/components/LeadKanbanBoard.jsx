import React, { useState, useEffect } from 'react';
import db from '../services/db';
import useAuth from '../hooks/useAuth';
import { 
  Plus, 
  User, 
  Edit, 
  Trash2, 
  X,
  Target,
  Briefcase,
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Linkedin,
  ExternalLink,
  DollarSign
} from 'lucide-react';

const LEAD_STATUSES = [
  { id: 'NUEVO', label: 'Nuevo', color: '#4c9aff' }, 
  { id: 'CONTACTADO', label: 'Contactado', color: '#ffab00' }, 
  { id: 'EN_NEGOCIACION', label: 'Negociación', color: '#6554c0' }, 
  { id: 'CERRADO_GANADO', label: 'Ganado', color: '#36b37e' }, 
  { id: 'CERRADO_PERDIDO', label: 'Perdido', color: '#ff5630' } 
];

const PRIORITY_ICONS = {
  'ALTA': <ChevronsUp size={14} color="#ff5630" />,
  'MEDIA': <ChevronUp size={14} color="#ffab00" />,
  'BAJA': <ChevronDown size={14} color="#4c9aff" />
};

export default function LeadKanbanBoard() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '', description: '', customerDetails: '', assignedTo: '', status: 'NUEVO', priority: 'MEDIA', value: ''
  });

  useEffect(() => {
    const unsubscribe = db.subscribeLeads((data) => {
      setLeads(data.filter(l => !l.deleted));
      setLoading(false);
    });
    db.getUsers().then(u => setUsers(u.filter(x => !x.deleted))).catch(console.error);
    return () => unsubscribe && unsubscribe();
  }, []);

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;
    const leadToUpdate = leads.find(l => l.id === leadId);
    if (!leadToUpdate || leadToUpdate.status === newStatus) return;
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    try { await db.updateLead(leadId, { status: newStatus }); } catch (err) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: leadToUpdate.status } : l));
    }
  };

  const cleanText = (text) => text ? text.replace(/^=/, '').trim() : '';

  const extractLinkedIn = (desc) => {
    if (!desc) return null;
    const match = desc.match(/https?:\/\/(www\.)?linkedin\.com\/in\/[^\s\n]+/);
    return match ? match[0] : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { ...formData, value: parseFloat(formData.value) || 0, assignedToName: users.find(u => u.id === formData.assignedTo)?.name || 'Sin Asignar' };
      if (editingLead) await db.updateLead(editingLead.id, payload);
      else {
        payload.createdBy = user.id;
        payload.createdByName = user.name;
        payload.createdAt = new Date().toISOString();
        await db.addLead(payload);
      }
      setShowModal(false);
    } catch (err) { alert("Error"); } finally { setLoading(false); }
  };

  const openForm = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        title: cleanText(lead.title),
        description: lead.description || '',
        customerDetails: cleanText(lead.customerDetails),
        assignedTo: lead.assignedTo || '',
        status: lead.status || 'NUEVO',
        priority: lead.priority || 'MEDIA',
        value: lead.value || ''
      });
    } else {
      setEditingLead(null);
      setFormData({ title: '', description: '', customerDetails: '', assignedTo: user?.id || '', status: 'NUEVO', priority: 'MEDIA', value: '' });
    }
    setShowModal(true);
  };

  if (loading && leads.length === 0) return <div className="loading-screen">Board Loading...</div>;

  return (
    <div className="crm-kanban-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{`
        .kanban-scroll-area { display: flex; gap: 16px; overflow-x: auto; flex: 1; padding: 10px 0 20px 0; scrollbar-width: thin; }
        .kanban-col { min-width: 280px; width: 280px; background: rgba(15, 23, 42, 0.4); border-radius: 8px; display: flex; flexDirection: column; border: 1px solid var(--border-color); }
        .jira-card { background: var(--bg-card); padding: 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); cursor: grab; transition: all 0.2s; position: relative; }
        .jira-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        .tag-badge { font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-bottom: 8px; text-transform: uppercase; }
        @media (max-width: 768px) { .kanban-col { min-width: 85vw; } }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, color: 'white' }}>CRM Leads</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{leads.length} prospectos en total</span>
        </div>
        <button className="btn-primary" onClick={() => openForm()} style={{ background: '#0052cc', borderRadius: '4px', fontSize: '13px' }}>
          <Plus size={16}/> New Lead
        </button>
      </div>

      <div className="kanban-scroll-area">
        {LEAD_STATUSES.map(col => {
          const colLeads = leads.filter(l => l.status === col.id);
          return (
            <div key={col.id} className="kanban-col" onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col.id)}>
              <div style={{ padding: '12px', borderBottom: `2px solid ${col.color}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{col.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{colLeads.length}</span>
              </div>
              <div style={{ padding: '8px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {colLeads.map(lead => {
                  const linkedin = extractLinkedIn(lead.description);
                  return (
                    <div key={lead.id} className="jira-card" draggable onDragStart={e => e.dataTransfer.setData('leadId', lead.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '13.5px', color: '#DEE4EA', fontWeight: 600, lineHeight: '1.4' }}>{cleanText(lead.title)}</h4>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {linkedin && (
                            <a href={linkedin} target="_blank" rel="noreferrer" style={{ color: '#0077b5', padding: '2px' }} title="LinkedIn Profile">
                              <Linkedin size={14}/>
                            </a>
                          )}
                          <button onClick={() => openForm(lead)} style={{ background: 'transparent', color: 'var(--text-muted)', padding: '2px' }}><MoreVertical size={14}/></button>
                        </div>
                      </div>

                      {lead.customerDetails && (
                        <div className="tag-badge" style={{ background: '#ffab00', color: '#172b4d' }}>{cleanText(lead.customerDetails)}</div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Briefcase size={14} color="var(--text-muted)"/>
                          {PRIORITY_ICONS[lead.priority] || PRIORITY_ICONS.MEDIA}
                          {lead.value > 0 && <span style={{ fontSize: '11.5px', color: 'var(--success)', fontWeight: 700 }}>${Math.round(lead.value)}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.6 }}>L-{lead.id.slice(-4).toUpperCase()}</span>
                          <div style={{ width: '22px', height: '22px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900, color: 'white' }}>
                            {lead.assignedToName?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '?'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, padding: '20px' }}>
          <div className="glass-card" style={{ padding: '25px', width: '100%', maxWidth: '480px', borderRadius: '8px', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{editingLead ? 'Edit Lead' : 'New Lead'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div><label>Title</label><input required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})}/></div>
              <div><label>Company</label><input value={formData.customerDetails} onChange={e=>setFormData({...formData, customerDetails: e.target.value})}/></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><label>Value ($)</label><input type="number" value={formData.value} onChange={e=>setFormData({...formData, value: e.target.value})}/></div>
                <div><label>Priority</label><select value={formData.priority} onChange={e=>setFormData({...formData, priority: e.target.value})}><option value="BAJA">Low</option><option value="MEDIA">Medium</option><option value="ALTA">High</option></select></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#0052cc', borderRadius: '4px' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
