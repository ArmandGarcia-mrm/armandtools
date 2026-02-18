
import React, { useState, useEffect, useCallback } from 'react';
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
      
      const newTickets: Ticket[] = parsedData.map((t, idx) => ({
        id: t.key || `manual-${Date.now()}-${idx}`,
        key: t.key || 'N/A',
        summary: t.summary || 'Untitiled Task',
        type: t.type || 'Task',
        priority: (t.priority as Priority) || 'Medium',
        status: 'To Do',
        dueDate: t.dueDate || 'No Date',
        notes: '',
      }));

      // Filter out duplicates based on key
      setTickets(prev => {
        const existingKeys = new Set(prev.map(p => p.key));
        const filteredNew = newTickets.filter(n => !existingKeys.has(n.key));
        return [...prev, ...filteredNew];
      });
      
      setInputText('');
      setActiveTab('board');
    } catch (error) {
      alert("Error parsing tickets. Please check your connection and try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const updateTicket = (id: string, updates: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTicket = (id: string) => {
    if (window.confirm("Delete this ticket?")) {
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
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
              Import Tickets
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
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-semibold text-slate-800">Direct Jira Import</h2>
                <p className="text-slate-500 text-sm mt-1">Copy and paste your Jira list view or ticket details below. Our AI will extract the structured data.</p>
              </div>
              <div className="p-6">
                <textarea
                  className="w-full h-64 p-4 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Paste Jira ticket data here... (e.g. LLDCRMYSG-4446 SG_YSL_AD...)"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={isParsing || !inputText.trim()}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-white transition-all ${isParsing ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'}`}
                  >
                    {isParsing ? (
                      <><i className="fa-solid fa-circle-notch animate-spin"></i> Parsing with Gemini...</>
                    ) : (
                      <><i className="fa-solid fa-wand-magic-sparkles"></i> Sync Tickets</>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                <h3 className="font-semibold text-indigo-900 mb-2">How it works</h3>
                <ul className="text-sm text-indigo-800 space-y-2">
                  <li><i className="fa-solid fa-check text-indigo-500 mr-2"></i> Paste messy Jira data directly</li>
                  <li><i className="fa-solid fa-check text-indigo-500 mr-2"></i> Gemini extracts Key, Type, Summary, and Priority</li>
                  <li><i className="fa-solid fa-check text-indigo-500 mr-2"></i> Duplicates are automatically skipped</li>
                </ul>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">Current Context</h3>
                <p className="text-sm text-slate-600">
                  You currently have <span className="font-bold text-slate-900">{tickets.length}</span> tickets in your workspace.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'board' && (
          <div className="animate-fadeIn">
            {tickets.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-clipboard-list text-2xl text-slate-400"></i>
                </div>
                <h3 className="text-lg font-medium text-slate-900">No tickets found</h3>
                <p className="text-slate-500 mt-2">Go to the Import tab to add your Jira tickets.</p>
                <button 
                  onClick={() => setActiveTab('import')}
                  className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Get Started
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket Key</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Summary</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusSelector 
                            currentStatus={ticket.status} 
                            onStatusChange={(s) => updateTicket(ticket.id, { status: s })} 
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                            {ticket.key}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900 font-medium max-w-xs truncate" title={ticket.summary}>
                            {ticket.summary}
                          </div>
                          <div className="text-xs text-slate-500 italic">{ticket.type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PriorityBadge priority={ticket.priority} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {ticket.dueDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => setEditingTicketId(ticket.id)}
                            className="text-slate-400 hover:text-indigo-600 p-1 rounded-md transition-colors mr-2"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button 
                            onClick={() => deleteTicket(ticket.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fadeIn max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Workflow Distribution</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        cursor={{fill: '#f8fafc'}}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {stats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Efficiency Stats</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-500">Completion Rate</span>
                      <span className="font-semibold text-slate-900">
                        {Math.round((tickets.filter(t => t.status === 'Done').length / (tickets.length || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${(tickets.filter(t => t.status === 'Done').length / (tickets.length || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <div className="text-xs text-slate-500 mb-1">Total Tickets</div>
                      <div className="text-2xl font-bold text-slate-900">{tickets.length}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <div className="text-xs text-slate-500 mb-1">Critical Priority</div>
                      <div className="text-2xl font-bold text-red-600">{tickets.filter(t => t.priority === 'Critical').length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeInFast">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editingTicket.key}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{editingTicket.type}</p>
              </div>
              <button 
                onClick={() => setEditingTicketId(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Summary</label>
                <textarea 
                  className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  rows={2}
                  value={editingTicket.summary}
                  onChange={(e) => updateTicket(editingTicket.id, { summary: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
                  <select 
                    className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none"
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
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                  <StatusSelector 
                    currentStatus={editingTicket.status} 
                    onStatusChange={(s) => updateTicket(editingTicket.id, { status: s })} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes & Context</label>
                <textarea 
                  className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[120px]"
                  placeholder="Add private notes, updates, or follow-up actions..."
                  value={editingTicket.notes}
                  onChange={(e) => updateTicket(editingTicket.id, { notes: e.target.value })}
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setEditingTicketId(null)}
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Close & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global styles for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInFast {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-fadeInFast {
          animation: fadeInFast 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
