/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  User
} from 'firebase/auth';
import { auth } from './firebase';
import { Registration, MANDALS } from './types';
import { 
  Flower2, 
  User as UserIcon, 
  Phone, 
  Calendar, 
  Users, 
  Utensils, 
  Send, 
  Lock, 
  LogOut, 
  Trash2, 
  Edit2, 
  Share2, 
  ChevronLeft,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          <div className="bg-saffron p-6 text-white flex justify-between items-center">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <ChevronLeft className="rotate-90" size={24} />
            </button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const Header = ({ title, showBack, onBack }: { title: string; showBack?: boolean; onBack?: () => void }) => (
  <header className="bg-saffron text-white py-6 px-4 shadow-lg sticky top-0 z-50">
    <div className="max-w-4xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Flower2 className="text-spiritual-gold animate-pulse" size={32} />
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
      </div>
    </div>
  </header>
);

const InputGroup = ({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="spiritual-label flex items-center gap-2">
      <Icon size={16} className="text-saffron" />
      {label}
    </label>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'form' | 'admin-login' | 'admin-dashboard'>('form');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Modal States
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Registration>>({
    mandal: MANDALS[0],
    name: '',
    phone: '',
    arrivalDate: format(new Date(), 'yyyy-MM-dd'),
    guestCount: 1,
    breakfastCount: 0,
    lunchCount: 0,
    dinnerCount: 0
  });

  // Admin Login State
  const [adminCreds, setAdminCreds] = useState({ id: '', password: '' });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setView('admin-login');
      } else if (window.location.hash === '#form' || window.location.hash === '') {
        setView('form');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check on initial load

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await fetch('/api/registrations');
      if (response.ok) {
        const data = await response.json();
        setRegistrations(data);
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to load registrations from Google Sheets.");
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message || "Failed to load registrations from Google Sheets.");
    }
  };

  useEffect(() => {
    if (view === 'admin-dashboard') {
      fetchRegistrations();
      // Poll for updates every 30 seconds
      const interval = setInterval(fetchRegistrations, 30000);
      return () => clearInterval(interval);
    }
  }, [view]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const createdAt = new Date().toISOString();
      const payload = { ...formData, createdAt };

      // Save ONLY to Google Sheets (via backend)
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save to Google Sheets");
      }

      setSuccess(true);
      setFormData({
        mandal: MANDALS[0],
        name: '',
        phone: '',
        arrivalDate: format(new Date(), 'yyyy-MM-dd'),
        guestCount: 1,
        breakfastCount: 0,
        lunchCount: 0,
        dinnerCount: 0
      });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCreds.id === 'NISHKHAM' && adminCreds.password === 'SEVEK123') {
      setView('admin-dashboard');
      setError(null);
    } else {
      setError("Invalid ID or Password.");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const response = await fetch(`/api/registrations/${deletingId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDeletingId(null);
        fetchRegistrations();
      } else {
        throw new Error("Delete failed");
      }
    } catch (err) {
      console.error("Delete Error:", err);
      setError("Failed to delete record.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg?.id) return;
    setLoading(true);
    try {
      const { id, ...updateData } = editingReg;
      const response = await fetch(`/api/registrations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (response.ok) {
        setEditingReg(null);
        fetchRegistrations();
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      console.error("Update Error:", err);
      setError("Failed to update record.");
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = (reg: Registration) => {
    const message = `*Registration Details*\n\n` +
      `*Mandal:* ${reg.mandal}\n` +
      `*Name:* ${reg.name}\n` +
      `*Phone:* ${reg.phone}\n` +
      `*Date:* ${format(new Date(reg.arrivalDate), 'dd MMM yyyy')}\n` +
      `*Guests:* ${reg.guestCount}\n` +
      `*Meals:*\n` +
      `- Breakfast: ${reg.breakfastCount}\n` +
      `- Lunch: ${reg.lunchCount}\n` +
      `- Dinner: ${reg.dinnerCount}`;
    
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleLogout = async () => {
    setView('form');
  };

  return (
    <div className="min-h-screen pb-12">
      <AnimatePresence mode="wait">
        {view === 'form' && (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Header title="Nishkham Seva Registration" />
            <main className="max-w-xl mx-auto px-4 mt-8">
              <div className="spiritual-card">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-saffron-dark">Welcome Guest</h2>
                  <p className="text-gray-500 text-sm">Please fill your details for seva management</p>
                </div>

                {success && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-green-50 border-2 border-green-200 p-4 rounded-xl mb-6 flex items-center gap-3 text-green-700"
                  >
                    <CheckCircle2 className="text-green-500" />
                    <span className="font-semibold">Registration Successful! Jay Swaminarayan.</span>
                  </motion.div>
                )}

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl mb-6 flex items-center gap-3 text-red-700">
                    <AlertCircle className="text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <InputGroup label="Select Mandal" icon={Flower2}>
                    <select 
                      className="spiritual-input appearance-none"
                      value={formData.mandal}
                      onChange={e => setFormData({...formData, mandal: e.target.value})}
                      required
                    >
                      {MANDALS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </InputGroup>

                  <InputGroup label="Full Name" icon={UserIcon}>
                    <input 
                      type="text" 
                      className="spiritual-input"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </InputGroup>

                  <InputGroup label="Phone Number" icon={Phone}>
                    <input 
                      type="tel" 
                      className="spiritual-input"
                      placeholder="Enter 10 digit number"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      required
                      pattern="[0-9]{10}"
                    />
                  </InputGroup>

                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Arrival Date" icon={Calendar}>
                      <input 
                        type="date" 
                        className="spiritual-input"
                        value={formData.arrivalDate}
                        onChange={e => setFormData({...formData, arrivalDate: e.target.value})}
                        required
                      />
                    </InputGroup>
                    <InputGroup label="Total Guests" icon={Users}>
                      <input 
                        type="number" 
                        className="spiritual-input"
                        min="1"
                        value={formData.guestCount}
                        onChange={e => setFormData({...formData, guestCount: parseInt(e.target.value)})}
                        required
                      />
                    </InputGroup>
                  </div>

                  <div className="bg-orange-50/50 p-4 rounded-2xl border-2 border-orange-100 space-y-4">
                    <div className="flex items-center gap-2 text-saffron-dark font-bold mb-2">
                      <Utensils size={20} />
                      <h3>Meal Requirements</h3>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Breakfast</label>
                        <input 
                          type="number" 
                          className="spiritual-input py-2 px-2 text-center"
                          min="0"
                          value={formData.breakfastCount}
                          onChange={e => setFormData({...formData, breakfastCount: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Lunch</label>
                        <input 
                          type="number" 
                          className="spiritual-input py-2 px-2 text-center"
                          min="0"
                          value={formData.lunchCount}
                          onChange={e => setFormData({...formData, lunchCount: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Dinner</label>
                        <input 
                          type="number" 
                          className="spiritual-input py-2 px-2 text-center"
                          min="0"
                          value={formData.dinnerCount}
                          onChange={e => setFormData({...formData, dinnerCount: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="spiritual-button flex items-center justify-center gap-2"
                  >
                    {loading ? "Submitting..." : (
                      <>
                        <Send size={20} />
                        Submit Registration
                      </>
                    )}
                  </button>
                </form>

                {/* Admin Login button removed as per request */}
              </div>
            </main>
          </motion.div>
        )}

        {view === 'admin-login' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center px-4"
          >
            <div className="spiritual-card w-full max-w-md">
              <button 
                onClick={() => setView('form')}
                className="mb-6 text-gray-400 hover:text-saffron flex items-center gap-1 text-sm"
              >
                <ChevronLeft size={16} /> Back to Form
              </button>
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="text-saffron" size={32} />
                </div>
                <h2 className="text-2xl font-bold">Admin Access</h2>
                <p className="text-gray-500">Enter credentials to manage records</p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 p-3 rounded-xl mb-6 text-red-700 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <InputGroup label="Admin ID" icon={UserIcon}>
                  <input 
                    type="text" 
                    className="spiritual-input"
                    value={adminCreds.id}
                    onChange={e => setAdminCreds({...adminCreds, id: e.target.value})}
                    required
                  />
                </InputGroup>
                <InputGroup label="Password" icon={Lock}>
                  <input 
                    type="password" 
                    className="spiritual-input"
                    value={adminCreds.password}
                    onChange={e => setAdminCreds({...adminCreds, password: e.target.value})}
                    required
                  />
                </InputGroup>
                <button type="submit" className="spiritual-button mt-4">
                  Login to Dashboard
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {view === 'admin-dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Header 
              title="Admin Dashboard" 
              showBack 
              onBack={() => setView('form')} 
            />
            
            <main className="max-w-6xl mx-auto px-4 mt-8">
              {/* Modals */}
              <Modal 
                isOpen={!!editingReg} 
                onClose={() => setEditingReg(null)} 
                title="Edit Registration"
              >
                {editingReg && (
                  <form onSubmit={handleUpdate} className="space-y-6">
                    <InputGroup label="Select Mandal" icon={Flower2}>
                      <select 
                        className="spiritual-input appearance-none"
                        value={editingReg.mandal}
                        onChange={e => setEditingReg({...editingReg, mandal: e.target.value})}
                        required
                      >
                        {MANDALS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </InputGroup>
                    <InputGroup label="Full Name" icon={UserIcon}>
                      <input 
                        type="text" 
                        className="spiritual-input"
                        value={editingReg.name}
                        onChange={e => setEditingReg({...editingReg, name: e.target.value})}
                        required
                      />
                    </InputGroup>
                    <InputGroup label="Phone Number" icon={Phone}>
                      <input 
                        type="tel" 
                        className="spiritual-input"
                        value={editingReg.phone}
                        onChange={e => setEditingReg({...editingReg, phone: e.target.value})}
                        required
                        pattern="[0-9]{10}"
                      />
                    </InputGroup>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Arrival Date" icon={Calendar}>
                        <input 
                          type="date" 
                          className="spiritual-input"
                          value={editingReg.arrivalDate}
                          onChange={e => setEditingReg({...editingReg, arrivalDate: e.target.value})}
                          required
                        />
                      </InputGroup>
                      <InputGroup label="Total Guests" icon={Users}>
                        <input 
                          type="number" 
                          className="spiritual-input"
                          min="1"
                          value={editingReg.guestCount}
                          onChange={e => setEditingReg({...editingReg, guestCount: parseInt(e.target.value)})}
                          required
                        />
                      </InputGroup>
                    </div>
                    <div className="bg-orange-50/50 p-4 rounded-2xl border-2 border-orange-100 space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Breakfast</label>
                          <input 
                            type="number" 
                            className="spiritual-input py-2 px-2 text-center"
                            min="0"
                            value={editingReg.breakfastCount}
                            onChange={e => setEditingReg({...editingReg, breakfastCount: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Lunch</label>
                          <input 
                            type="number" 
                            className="spiritual-input py-2 px-2 text-center"
                            min="0"
                            value={editingReg.lunchCount}
                            onChange={e => setEditingReg({...editingReg, lunchCount: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Dinner</label>
                          <input 
                            type="number" 
                            className="spiritual-input py-2 px-2 text-center"
                            min="0"
                            value={editingReg.dinnerCount}
                            onChange={e => setEditingReg({...editingReg, dinnerCount: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="spiritual-button">
                      {loading ? "Updating..." : "Save Changes"}
                    </button>
                  </form>
                )}
              </Modal>

              <Modal 
                isOpen={!!deletingId} 
                onClose={() => setDeletingId(null)} 
                title="Confirm Delete"
              >
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 className="text-red-500" size={40} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">Are you sure?</h4>
                    <p className="text-gray-500">This action cannot be undone. This record will be permanently removed.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Modal>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold">Registration History</h2>
                  <p className="text-gray-500">Total {registrations.length} records found</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right mr-4">
                    <p className="text-xs text-gray-400 font-bold uppercase">Database Storage</p>
                    <p className="text-xs font-medium text-saffron">Google Sheets Only</p>
                    <a 
                      href={`https://docs.google.com/spreadsheets/d/${import.meta.env.VITE_GOOGLE_SHEET_ID}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-saffron hover:underline block"
                    >
                      Open Google Sheet ↗
                    </a>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="px-4 py-2 border-2 border-red-100 text-red-500 rounded-xl hover:bg-red-50 flex items-center gap-2 font-semibold transition-all"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {registrations.length === 0 ? (
                  <div className="spiritual-card text-center py-20">
                    <Search className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">No registrations found yet.</p>
                  </div>
                ) : (
                  registrations.map((reg) => (
                    <motion.div 
                      layout
                      key={reg.id}
                      className="spiritual-card hover:shadow-2xl transition-all group"
                    >
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-orange-100 text-saffron-dark text-xs font-bold rounded-full uppercase tracking-wider">
                              {reg.mandal}
                            </span>
                            <span className="text-xs text-gray-400">
                              {format(new Date(reg.createdAt), 'dd MMM yyyy, hh:mm a')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                                <UserIcon className="text-gray-400" size={20} />
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 font-bold uppercase">Name</p>
                                <p className="font-bold text-spiritual-accent">{reg.name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                                <Phone className="text-gray-400" size={20} />
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 font-bold uppercase">Phone</p>
                                <p className="font-bold text-spiritual-accent">{reg.phone}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                                <Calendar className="text-gray-400" size={20} />
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 font-bold uppercase">Arrival Date</p>
                                <p className="font-bold text-spiritual-accent">
                                  {format(new Date(reg.arrivalDate), 'dd MMM yyyy')}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-orange-50/30 p-4 rounded-xl border border-orange-100 flex flex-wrap gap-8">
                            <div className="flex items-center gap-2">
                              <Users size={18} className="text-saffron" />
                              <span className="text-sm font-bold">Guests: {reg.guestCount}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Utensils size={18} className="text-saffron" />
                              <span className="text-sm">B: <span className="font-bold">{reg.breakfastCount}</span></span>
                              <span className="text-sm">L: <span className="font-bold">{reg.lunchCount}</span></span>
                              <span className="text-sm">D: <span className="font-bold">{reg.dinnerCount}</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex md:flex-col gap-2 justify-end">
                          <button 
                            onClick={() => handleShareWhatsApp(reg)}
                            className="flex-1 md:flex-none p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                            title="Share on WhatsApp"
                          >
                            <Share2 size={20} />
                            <span className="md:hidden">WhatsApp</span>
                          </button>
                          <button 
                            onClick={() => setEditingReg(reg)}
                            className="flex-1 md:flex-none p-3 bg-orange-100 hover:bg-orange-200 text-saffron-dark rounded-xl transition-all flex items-center justify-center gap-2"
                            title="Edit Record"
                          >
                            <Edit2 size={20} />
                            <span className="md:hidden">Edit</span>
                          </button>
                          <button 
                            onClick={() => setDeletingId(reg.id!)}
                            className="flex-1 md:flex-none p-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all flex items-center justify-center gap-2"
                            title="Delete Record"
                          >
                            <Trash2 size={20} />
                            <span className="md:hidden">Delete</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
