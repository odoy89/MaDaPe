import { useEffect, useState, useRef } from 'react';
import { apiService } from '../api';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Users, FileCheck2, History, MapPin, Maximize } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const UserIcon = L.divIcon({ 
  html: `<div style="background-color: #10b981; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.2); border: 2.5px solid white;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
         </div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

function MapResizer({ isFullscreen }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [isFullscreen, map]);
  return null;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    pelanggan: 0,
    toAktif: 0,
    toSelesai: 0,
    history: 0
  });
  const [loading, setLoading] = useState(true);

  const [allTOs, setAllTOs] = useState([]);
  const [historyIDs, setHistoryIDs] = useState(new Set());
  const [petugasList, setPetugasList] = useState([]);
  const [selectedPetugas, setSelectedPetugas] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [pel, to, hist, users] = await Promise.all([
          apiService.getPelanggan(),
          apiService.getTO(),
          apiService.getAllHistory()
        ]);
        
        // Match logic with app dashboard
        const toAktif = to.length;
        const historyIDPELs = new Set(hist.map(h => h.idpel));
        const toSelesai = historyIDPELs.size;
        
        setStats({
          pelanggan: pel.length,
          toAktif,
          toSelesai,
          history: hist.length
        });

        setAllTOs(to);
        setHistoryIDs(historyIDPELs);

      } catch(e) {
        console.error("Failed to load dashboard", e);
      } finally {
        setLoading(false);
      }
    }
    load();

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPetugasList(data);
    });

    return () => unsubUsers();
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const dataChart = [
    { name: 'Pelanggan', value: stats.pelanggan, color: '#3b82f6' },
    { name: 'Target Operasi (TO)', value: stats.toAktif, color: '#f59e0b' },
    { name: 'Selesai TO', value: stats.toSelesai, color: '#10b981' },
    { name: 'Total History', value: stats.history, color: '#6366f1' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="flex flex-col fade-in">
      <div className="sticky top-0 z-40 bg-slate-50 pt-4 pb-6 -mt-4 mb-8 -mx-4 px-4 md:-mt-8 md:-mx-8 md:px-8 md:pt-8 shadow-[0_4px_20px_-15px_rgba(0,0,0,0.1)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Dashboard Statistik</h1>
          <p className="text-slate-500 mt-1">Ringkasan data aplikasi MaDaPe terkini.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Pelanggan" value={stats.pelanggan} icon={Users} color="bg-blue-500" />
          <StatCard title="Total TO" value={stats.toAktif} icon={FileCheck2} color="bg-orange-500" />
          <StatCard title="Sudah Dikerjakan" value={stats.toSelesai} icon={FileCheck2} color="bg-emerald-500" />
          <StatCard title="Total Riwayat Kunjungan" value={stats.history} icon={History} color="bg-indigo-500" />
        </div>
      </div>

      {stats.toAktif > 0 && (
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 ${!isFullscreen ? 'relative z-10' : 'relative z-[4000]'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="text-blue-600" /> Peta Lokasi Target Operasi
              </h2>
              <p className="text-sm text-slate-500 mt-1">Live monitoring titik GPS pelanggan/TO untuk petugas</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select 
                value={selectedPetugas} 
                onChange={(e) => setSelectedPetugas(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium w-full md:w-64"
              >
                <option value="">Semua Petugas</option>
                {petugasList.map(p => (
                  <option key={p.user} value={p.user}>{p.user}</option>
                ))}
              </select>
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-lg border border-slate-200 transition flex items-center justify-center" 
                title="Toggle Fullscreen"
              >
                <Maximize size={20} />
              </button>
            </div>
          </div>
          
          <div className={isFullscreen ? "fixed inset-0 z-[4000] bg-slate-50 p-4 md:p-6 flex flex-col" : "h-96 w-full rounded-xl overflow-hidden border border-slate-200 relative z-0 isolate"}>
            {isFullscreen && (() => {
              const filteredTOs = allTOs.filter(t => selectedPetugas ? t.user === selectedPetugas : true);
              const totalTO = filteredTOs.length;
              const sudahDikerjakan = filteredTOs.filter(t => historyIDs.has(t.idpel)).length;
              const belumDikerjakan = totalTO - sudahDikerjakan;

              return (
                <div className="flex flex-col mb-4 gap-4 shrink-0">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-xl font-bold">Peta Fullscreen</h2>
                    <div className="flex gap-2 w-full md:w-auto">
                      <select 
                        value={selectedPetugas} 
                        onChange={(e) => setSelectedPetugas(e.target.value)}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium w-full md:w-64 shadow-sm"
                      >
                        <option value="">Semua Petugas</option>
                        {petugasList.map(p => (
                          <option key={p.user} value={p.user}>{p.user}</option>
                        ))}
                      </select>
                      <button onClick={() => setIsFullscreen(false)} className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg border border-slate-200 shadow-sm font-medium transition flex items-center justify-center whitespace-nowrap">Tutup Fullscreen</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                        <FileCheck2 size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">Total TO {selectedPetugas ? `(${selectedPetugas})` : ''}</p>
                        <p className="text-2xl font-bold text-slate-800">{totalTO}</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600">
                        <FileCheck2 size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">Sudah Dikerjakan</p>
                        <p className="text-2xl font-bold text-slate-800">{sudahDikerjakan}</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600">
                        <FileCheck2 size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">Belum Dikerjakan</p>
                        <p className="text-2xl font-bold text-slate-800">{belumDikerjakan}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="flex-1 relative rounded-lg overflow-hidden h-full shadow-inner">
              <MapContainer center={[-5.450000, 105.266666]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <MapResizer isFullscreen={isFullscreen} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {allTOs
                .filter(t => selectedPetugas ? t.user === selectedPetugas : true)
                .map((t, i) => {
                if (t.latitude && t.longitude) {
                  return (
                    <Marker key={i} position={[parseFloat(t.latitude), parseFloat(t.longitude)]}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold border-b pb-1 mb-1">{t.idpel}</p>
                          <p className="font-semibold text-slate-800">{t.nama}</p>
                          <p className="text-slate-600">{t.alamat}</p>
                          <p className="mt-2 pt-2 border-t text-xs">Petugas: <b>{t.user || '-'}</b></p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })}
              {/* Live Location Petugas */}
              {petugasList
                .filter(p => selectedPetugas ? p.user === selectedPetugas : true)
                .map((p, i) => {
                if (p.latitude && p.longitude) {
                  return (
                    <Marker key={`p_${i}`} position={[parseFloat(p.latitude), parseFloat(p.longitude)]} icon={UserIcon}>
                      <Tooltip permanent direction="top" offset={[0, -20]} className="font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 rounded shadow-sm">
                        {p.user}
                      </Tooltip>
                      <Popup>
                        <div className="text-sm text-center">
                          <p className="font-bold text-emerald-700">Live Petugas</p>
                          <p className="font-semibold">{p.user}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })}
            </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center text-white shadow-lg`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
