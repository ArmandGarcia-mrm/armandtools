
import React, { useState, useEffect } from 'react';
import { parseTicketsFromText } from './geminiService';
import { Ticket, Status, Priority } from './types';
import PriorityBadge from './components/PriorityBadge';
import StatusSelector from './components/StatusSelector';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const App: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [activeTab, setActiveTab] = useState<'board' | 'analytics' | 'import'>('board');
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('jirasync_tickets');
    if (saved) {
      try {
        setTickets(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading saved tickets", e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('jirasync_tickets', JSON.stringify(tickets));
  }, [tickets]);

  const handleImport = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    try {
      const parsedData = await parseTicketsFromText(inputText);
      
      if (!parsedData || parsedData.length === 0) {
        alert("No tickets could be extracted. Please check your pasted text and try again.");
        return;
      }

      const newTickets: Ticket[] = parsedData.map((t, idx) => ({
        id: t.key || `manual-${Date.now()}-${idx}`,
        key: t.key || 'TASK',
        summary: t.summary || 'Untitled Task',
        type: t.type || 'Task',
        priority: (t.priority as Priority) || 'Medium',
        status: 'To Do',
        dueDate: t.dueDate || 'No Date',
        notes: '',
      }));

      setTickets(prev => {
        const existingKeys = new Set(prev.map(p => p.key));
        const filteredNew = newTickets.filter(n => n.key === 'TASK' || !existingKeys.has(n.key));
        return [...prev, ...filteredNew];
      });
      
      setInputText('');
      setActiveTab('board');
    } catch (error) {
      console.error("Parsing error:", error);
      alert("Error parsing tickets. Make sure your Gemini API key is configured correctly.");
    } finally {
      setIsParsing(false);
    }
  };

  const updateTicket = (id: string, updates: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTicket = (id: string) => {
    if (window.confirm("Are you sure you want to delete this ticket?")) {
      setTickets(prev => prev.filter(t => t.id !== id));
    }
  };

  const stats = [
    { name: 'To Do', value: tickets.filter(t => t.status === 'To Do').length, color: '#94a3b8' },
    { name: 'In Progress', value: tickets.filter(t => t.status === 'In Progress').length, color: '#3b82f6' },
    { name: 'Review', value: tickets.filter(t => t.status === 'Review').length, color: '#f59e0b' },
    { name: 'Done', value: tickets.filter(t => t.status === 'Done').length, color: '#10b981' },
  ];

  const editingTicket = tickets.find(t => t.id === editingTicketId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <i className="fa-solid fa-list-check text-xl"></i>
            </div>
            <h1 className="text-xl font-bold tracking-tight">JiraSync <span className="text-indigo-400">Pro</span></h1>
          </div>
          
          <nav className="flex bg-slate-800 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('board')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'board' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('import')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'import' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Import
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Analytics
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {activeTab === 'import' && (
          <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">Import Jira Tickets</h2>
                  <p className="text-slate-500 text-sm mt-1">Paste your Jira ticket rows here. AI will extract keys, summaries, and priorities.</p>
                </div>
                <div className="hidden md:block">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-mono uppercase">Gemini-3-Flash</span>
                </div>
              </div>
              <div className="p-6">
                <textarea
                  className="w-full h-80 p-4 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Paste Jira data here (e.g. key, title, priority...)"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="text-xs text-slate-400 italic">
                    <i className="fa-solid fa-circle-info mr-1"></i> For best results, include ticket keys (e.g., PROJ-123)
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={isParsing || !inputText.trim()}
                    className={`w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all ${isParsing ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-95'}`}
                  >
                    {isParsing ? (
                      <><i className="fa-solid fa-circle-notch animate-spin"></i> Analyzing Data...</>
                    ) : (
                      <><i className="fa-solid fa-wand-magic-sparkles"></i> Sync Tickets</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'board' && (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-end mb-6">
               <div>
                 <h2 className="text-2xl font-bold text-slate-900">Active Workstream</h2>
                 <p className="text-slate-500">Managing {tickets.length} tickets from your local storage.</p>
               </div>
               {tickets.length > 0 && (
                 <button 
                  onClick={() => { if(window.confirm('Clear all tickets?')) setTickets([]); }}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold uppercase tracking-wider"
                 >
                   Clear All
                 </button>
               )}
            </div>

            {tickets.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fa-solid fa-paste text-3xl text-slate-300"></i>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Your board is empty</h3>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto">Copy tickets from your Jira backlog and paste them in the Import tab to get started.</p>
                <button 
                  onClick={() => setActiveTab('import')}
                  className="mt-8 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                >
                  Go to Import
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Reference</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Summary</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {tickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusSelector 
                              currentStatus={ticket.status} 
                              onStatusChange={(s) => updateTicket(ticket.id, { status: s })} 
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-black text-indigo-700 bg-indigo-100/50 px-2 py-1 rounded">
                              {ticket.key}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-900 font-semibold line-clamp-1" title={ticket.summary}>
                              {ticket.summary}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-2">
                              <span className="uppercase">{ticket.type}</span>
                              {ticket.dueDate !== 'No Date' && (
                                <>
                                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                  <span>DUE: {ticket.dueDate}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <PriorityBadge priority={ticket.priority} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={() => setEditingTicketId(ticket.id)}
                                className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-all"
                              >
                                <i className="fa-solid fa-edit"></i>
                              </button>
                              <button 
                                onClick={() => deleteTicket(ticket.id)}
                                className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fadeIn max-w-5xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Workflow Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
                  <i className="fa-solid fa-chart-column text-indigo-500"></i>
                  Status Distribution
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                        {stats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                  <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Completion Rate</div>
                  <div className="text-5xl font-black text-slate-900">
                    {Math.round((tickets.filter(t => t.status === 'Done').length / (tickets.length || 1)) * 100)}%
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-6 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-1000 ease-out"
                      style={{ width: `${(tickets.filter(t => t.status === 'Done').length / (tickets.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-indigo-600 p-8 rounded-2xl shadow-lg text-white">
                  <div className="text-sm font-bold text-indigo-200 uppercase tracking-widest mb-1">Total Scope</div>
                  <div className="text-4xl font-black">{tickets.length}</div>
                  <p className="text-indigo-100 text-xs mt-4 leading-relaxed font-medium">
                    You have {tickets.filter(t => t.status !== 'Done').length} active items remaining in your current sprint cycle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeInFast">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black bg-indigo-600 text-white px-2 py-1 rounded">{editingTicket.key}</span>
                <h3 className="font-bold text-slate-800">Edit Ticket</h3>
              </div>
              <button onClick={() => setEditingTicketId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className="fa-solid fa-circle-xmark text-2xl"></i>
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5">Summary</label>
                <input 
                  type="text"
                  className="w-full p-3 text-sm font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 transition-all"
                  value={editingTicket.summary}
                  onChange={(e) => updateTicket(editingTicket.id, { summary: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5">Priority</label>
                  <select 
                    className="w-full p-3 text-sm font-semibold border border-slate-200 rounded-xl outline-none bg-slate-50"
                    value={editingTicket.priority}
                    onChange={(e) => updateTicket(editingTicket.id, { priority: e.target.value as Priority })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5">Status</label>
                  <StatusSelector 
                    currentStatus={editingTicket.status} 
                    onStatusChange={(s) => updateTicket(editingTicket.id, { status: s })} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5">Notes & Context</label>
                <textarea 
                  className="w-full p-4 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 min-h-[160px] resize-none"
                  placeholder="Additional context, links, or sub-tasks..."
                  value={editingTicket.notes}
                  onChange={(e) => updateTicket(editingTicket.id, { notes: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setEditingTicketId(null)}
                className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
              >
                Close & Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInFast {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fadeInFast {
          animation: fadeInFast 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
