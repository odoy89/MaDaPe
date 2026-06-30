import React, { useState, useEffect } from 'react';
import { apiService } from '../api';
import { db } from '../firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { Trash2, UserPlus, Shield, Plus, Settings2, Zap, LayoutGrid } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);

  const userStr = localStorage.getItem('user');
  const userObj = userStr ? JSON.parse(userStr) : null;
  const isAdmin = userObj?.akses === 'ADMIN';

  // Users State
  const [users, setUsers] = useState([]);
  const [showModalUser, setShowModalUser] = useState(false);
  const [userModalMode, setUserModalMode] = useState('add');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [akses, setAkses] = useState('USER');

  // Unit State
  const [units, setUnits] = useState([]);
  const [showModalUnit, setShowModalUnit] = useState(false);
  const [unitModalMode, setUnitModalMode] = useState('add');
  const [unitName, setUnitName] = useState('');

  // Tarif & Daya State
  const [tarifs, setTarifs] = useState([]);
  const [showModalTarif, setShowModalTarif] = useState(false);
  const [tarifModalMode, setTarifModalMode] = useState('add');
  const [tarifName, setTarifName] = useState('');
  const [dayaListText, setDayaListText] = useState(''); // comma separated

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [u, un, ta] = await Promise.all([
        apiService.getUsers(),
        apiService.getSettingsUnit(),
        apiService.getSettingsTarif()
      ]);
      setUsers(u);
      setUnits(un);
      setTarifs(ta);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // === USER HANDLERS ===
  const handleTambahUser = async (e) => {
    e.preventDefault();
    if (!username || !password) return Swal.fire('Error', 'Username dan Password harus diisi!', 'error');
    try {
      await apiService.tambahUser({ user: username, password, akses });
      Swal.fire({ icon: 'success', title: userModalMode === 'add' ? 'Ditambahkan' : 'Diperbarui', showConfirmButton: false, timer: 1500 });
      setShowModalUser(false);
      setUsername(''); setPassword(''); setAkses('USER');
      loadAllData();
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  };
  
  const openEditUser = (u) => {
    setUsername(u.user);
    setPassword(u.password);
    setAkses(u.akses || 'USER');
    setUserModalMode('edit');
    setShowModalUser(true);
  };
  const handleHapusUser = async (user) => {
    if (!window.confirm(`Yakin ingin menghapus pengguna ${user}?`)) return;
    try {
      await apiService.hapusUser(user);
      loadAllData();
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  // === UNIT HANDLERS ===
  const handleTambahUnit = async (e) => {
    e.preventDefault();
    if (!unitName) return;
    try {
      await apiService.addSettingsUnit(unitName);
      Swal.fire({ icon: 'success', title: unitModalMode === 'add' ? 'Ditambahkan' : 'Diperbarui', showConfirmButton: false, timer: 1500 });
      setShowModalUnit(false);
      setUnitName('');
      loadAllData();
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  const openEditUnit = (u) => {
    setUnitName(u.nama);
    setUnitModalMode('edit');
    setShowModalUnit(true);
  };
  const handleHapusUnit = async (name) => {
    if (!window.confirm(`Yakin ingin menghapus unit ${name}?`)) return;
    try {
      await apiService.deleteSettingsUnit(name);
      loadAllData();
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  // === TARIF HANDLERS ===
  const handleTambahTarif = async (e) => {
    e.preventDefault();
    if (!tarifName || !dayaListText) return;
    try {
      const arrDaya = dayaListText.split(',').map(d => d.trim()).filter(d => d !== "");
      const docId = tarifName.replace(/\//g, '_');
      await apiService.addSettingsTarif(docId, tarifName, arrDaya);
      Swal.fire({ icon: 'success', title: tarifModalMode === 'add' ? 'Ditambahkan' : 'Diperbarui', showConfirmButton: false, timer: 1500 });
      setShowModalTarif(false);
      setTarifName(''); setDayaListText('');
      loadAllData();
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  const openEditTarif = (t) => {
    setTarifName(t.tarif);
    setDayaListText((t.daya || []).join(', '));
    setTarifModalMode('edit');
    setShowModalTarif(true);
  };
  const handleHapusTarif = async (name) => {
    const docId = name.replace(/\//g, '_');
    if (!window.confirm(`Yakin ingin menghapus tarif ${name}?`)) return;
    try {
      await apiService.deleteSettingsTarif(docId);
      loadAllData();
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  const handleInitDefaults = async (type) => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      if (type === 'units') {
        const defaultUnits = ["17100","17110","17120","17130","17131","17150","17180","17200","17210","17220","17270","17280","17410","17420","17400","17430","17440","17300","17330","17340","17350","17360","17370"];
        defaultUnits.forEach(u => {
          batch.set(doc(db, "settings_unit", u), { nama: u });
        });
      } else if (type === 'tarif') {
        const defaultTarifs = {
          "S1": ["450","900","1300","2200","3500","4400","5500","7700","10600","11000","13200","16500","23000","33000","41500","53000","66000","82500","105000","131000","147000","164000","197000"],
          "R1": ["450","1300","2200"],
          "R1/R1M": ["900"],
          "R2": ["3500","4400","5500"],
          "R3": ["7700","10600","11000","13200","16500","23000","33000","41500","53000","66000","82500","105000","131000","147000","164000","197000"],
          "B1": ["450","900","1300","2200","3500","4400","5500"],
          "B2": ["7700","10600","11000","13200","16500","23000","33000","41500","53000","66000","82500","105000","131000","147000","164000","197000"],
          "B3": ["200000","260000","345000","430000","555000","690000","865000","1110000","1385000","1730000","2165000","2590000","3465000","4330000","5540000","6930000","8660000","10390000","13850000","17320000","20780000","27710000","30000000"],
          "I1": ["450","900","1300","2200","3500","4400","5500","7700","10600","11000","13200"],
          "I2": ["16500","23000","33000","41500","53000","66000","82500","105000","131000","147000","164000","197000"],
          "P1": ["450","900","1300","2200","3500","4400","5500","7700","10600","11000","13200","16500","23000","33000","41500","53000","66000","82500","105000","131000","147000","164000","197000"],
          "P3": ["450","900","1300","2200","3500","4400","5500","7700","10600","11000","13200","16500","23000","33000","41500","53000","66000","82500","105000","131000","147000","164000","197000"]
        };
        for (const [t, d] of Object.entries(defaultTarifs)) {
          const docId = t.replace(/\//g, '_');
          batch.set(doc(db, "settings_tarif", docId), { tarif: t, daya: d });
        }
      }
      await batch.commit();
      Swal.fire({ icon: 'success', title: 'Data Default Berhasil Dimuat', showConfirmButton: false, timer: 1500 });
      loadAllData();
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Pengaturan Sistem</h1>
        <p className="text-slate-500 mt-1">Kelola data pengguna, unit operasi, dan struktur tarif daya.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Settings2 size={18} /> Pengguna Aplikasi
        </button>
        <button 
          onClick={() => setActiveTab('units')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === 'units' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <LayoutGrid size={18} /> Master Unit
        </button>
        <button 
          onClick={() => setActiveTab('tarif')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === 'tarif' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Zap size={18} /> Master Tarif & Daya
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8 text-center text-slate-500 my-auto">Memuat data pengaturan...</div>
        ) : (
          <div className="flex-1 overflow-auto">
            
            {/* === TAB USERS === */}
            {activeTab === 'users' && (
              <>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-semibold text-slate-800">Daftar Pengguna</h3>
                  <button onClick={() => setShowModalUser(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm text-sm font-medium">
                    <UserPlus size={16} /> Tambah Pengguna
                  </button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 shadow-sm">
                    <tr>
                      <th className="px-6 py-4">Username</th>
                      <th className="px-6 py-4">Password</th>
                      <th className="px-6 py-4">Hak Akses</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u, i) => (
                      <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-700">{u.user}</td>
                        <td className="px-6 py-4 text-slate-500">{"•".repeat(u.password?.length || 4)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 ${u.akses === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {u.akses === 'ADMIN' && <Shield size={12} />}
                            {u.akses || 'USER'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isAdmin && (
                            <div className="flex justify-center gap-2">
                              <button onClick={() => openEditUser(u)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition font-medium">Edit</button>
                              <button onClick={() => handleHapusUser(u.id || u.user)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition font-medium">Hapus</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* === TAB UNITS === */}
            {activeTab === 'units' && (
              <>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-semibold text-slate-800">Daftar Unit Operasi</h3>
                  <div className="flex gap-2">
                    {units.length === 0 && (
                      <button onClick={() => handleInitDefaults('units')} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-200 transition shadow-sm text-sm font-medium">
                        <Zap size={16} /> Muat Data Bawaan PLN
                      </button>
                    )}
                    <button onClick={() => setShowModalUnit(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm text-sm font-medium">
                      <Plus size={16} /> Tambah Unit
                    </button>
                  </div>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 w-16 text-center">No</th>
                      <th className="px-6 py-4">Nama Unit</th>
                      <th className="px-6 py-4 text-center w-32">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {units.map((u, i) => (
                      <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 text-center text-slate-400">{i+1}</td>
                        <td className="px-6 py-4 font-semibold text-slate-700">{u.nama}</td>
                        <td className="px-6 py-4 text-center">
                          {isAdmin && (
                            <div className="flex justify-center gap-2">
                              <button onClick={() => openEditUnit(u)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition font-medium">Edit</button>
                              <button onClick={() => handleHapusUnit(u.nama)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition font-medium">Hapus</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {units.length === 0 && <tr><td colSpan="3" className="p-6 text-center text-slate-400">Data unit masih kosong.</td></tr>}
                  </tbody>
                </table>
              </>
            )}

            {/* === TAB TARIF === */}
            {activeTab === 'tarif' && (
              <>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-semibold text-slate-800">Struktur Tarif & Daya</h3>
                  <div className="flex gap-2">
                    {tarifs.length === 0 && (
                      <button onClick={() => handleInitDefaults('tarif')} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-200 transition shadow-sm text-sm font-medium">
                        <Zap size={16} /> Muat Data Bawaan PLN
                      </button>
                    )}
                    <button onClick={() => setShowModalTarif(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm text-sm font-medium">
                      <Plus size={16} /> Tambah Tarif
                    </button>
                  </div>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 w-32">Gol. Tarif</th>
                      <th className="px-6 py-4">Pilihan Daya Tersedia</th>
                      <th className="px-6 py-4 text-center w-32">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tarifs.map((t, i) => (
                      <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-blue-700">{t.tarif}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {t.daya && t.daya.map(d => (
                              <span key={d} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium border border-slate-200">{d} VA</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isAdmin && (
                            <div className="flex justify-center gap-2">
                              <button onClick={() => openEditTarif(t)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition font-medium">Edit</button>
                              <button onClick={() => handleHapusTarif(t.tarif)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition font-medium">Hapus</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {tarifs.length === 0 && <tr><td colSpan="3" className="p-6 text-center text-slate-400">Data tarif masih kosong.</td></tr>}
                  </tbody>
                </table>
              </>
            )}

          </div>
        )}
      </div>

      {/* MODALS */}
      {showModalUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">{userModalMode === 'add' ? 'Tambah' : 'Edit'} Pengguna</h2>
            <form onSubmit={handleTambahUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)} disabled={userModalMode === 'edit'} required className="w-full p-2.5 border rounded-lg disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-2.5 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Akses</label>
                <select value={akses} onChange={e => setAkses(e.target.value)} className="w-full p-2.5 border rounded-lg">
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModalUser(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalUnit && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{unitModalMode === 'add' ? 'Tambah' : 'Edit'} Unit</h2>
            <form onSubmit={handleTambahUnit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kode / Nama Unit</label>
                <input required disabled={unitModalMode === 'edit'} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50" placeholder="Misal: 17100" value={unitName} onChange={(e) => setUnitName(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModalUnit(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition font-medium">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalTarif && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">{tarifModalMode === 'add' ? 'Tambah' : 'Edit'} Master Tarif & Daya</h2>
            <form onSubmit={handleTambahTarif} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Kode Tarif (Misal: R1/R1M)</label>
                <input value={tarifName} onChange={e => setTarifName(e.target.value.toUpperCase())} disabled={tarifModalMode === 'edit'} required className="w-full p-2.5 border rounded-lg disabled:opacity-50 uppercase" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">List Daya (Pisahkan dengan koma)</label>
                <textarea value={dayaListText} onChange={e => setDayaListText(e.target.value)} required className="w-full p-2.5 border rounded-lg h-24" placeholder="450, 900, 1300" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModalTarif(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
