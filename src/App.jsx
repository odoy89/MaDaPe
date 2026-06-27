import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileCheck2, Settings as SettingsIcon, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Dashboard from './pages/Dashboard';
import Pelanggan from './pages/Pelanggan';
import TOPage from './pages/TOPage';
import Login from './pages/Login';
import Settings from './pages/Settings';

function Sidebar({ onLogout, isOpen, setIsOpen }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  
  const userStr = localStorage.getItem('user');
  const userObj = userStr ? JSON.parse(userStr) : null;
  const isAdmin = userObj?.akses === 'ADMIN';

  const menu = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Pelanggan', path: '/pelanggan', icon: Users },
    { name: 'Data TO', path: '/to', icon: FileCheck2 },
  ];

  if (isAdmin) {
    menu.push({ name: 'Pengaturan', path: '/settings', icon: SettingsIcon });
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-[2900] md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[3000] w-64 bg-slate-900 text-slate-300 min-h-screen p-4 flex flex-col justify-between transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 px-4 py-6">
            <div className="flex items-center gap-3">
              <img src="/assets/images/app_icon.png" alt="Logo" className="w-8 h-8 object-contain rounded-md" />
              <div className="text-white font-bold text-xl">MaDaPe Admin</div>
            </div>
            <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {menu.map((m) => {
              const Icon = m.icon;
              return (
                <Link 
                  key={m.path} 
                  to={m.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive(m.path) 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{m.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
        
        <div className="border-t border-slate-700 pt-4 mt-4">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-red-500/10 hover:text-red-400 text-slate-400"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

function ProtectedRoute({ children }) {
  const user = localStorage.getItem('user');
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    Swal.fire({
      title: 'Keluar Aplikasi?',
      text: "Anda harus login kembali untuk masuk.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      <Sidebar onLogout={handleLogout} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center gap-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600 hover:text-slate-900 p-2 -ml-2 rounded-lg bg-slate-100">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/assets/images/app_icon.png" alt="Logo" className="w-7 h-7 object-contain rounded-md" />
            <div className="font-bold text-slate-800 text-lg">MaDaPe Admin</div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto w-full relative">
          <div className="p-4 md:p-8 min-h-full">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pelanggan" element={<Pelanggan />} />
              <Route path="/to" element={<TOPage />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
