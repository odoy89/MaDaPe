import { useEffect, useState, useRef } from 'react';
import { apiService } from '../api';
import { Search, Download, Upload, MapPin, ImageIcon, FileSpreadsheet, Plus, AlertTriangle, Trash2, Edit, Map, Crosshair, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet marker icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function TOPage() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [historyData, setHistoryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showPhoto, setShowPhoto] = useState(null);

  const userStr = localStorage.getItem('user');
  const userObj = userStr ? JSON.parse(userStr) : null;
  const isAdmin = userObj?.akses === 'ADMIN';
  
  // Dynamic Settings
  const [dbUnits, setDbUnits] = useState([]);
  const [dbTarifs, setDbTarifs] = useState([]);

  // UI States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState([-6.200000, 106.816666]);
  
  const [formData, setFormData] = useState({
    unit: '', idpel: '', nama: '', tarif: '', daya: '', alamat: '', latitude: '', longitude: '', user: ''
  });
  
  const handleInput = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  const markerRef = useRef(null);
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setFormData(prev => ({...prev, latitude: e.latlng.lat.toString(), longitude: e.latlng.lng.toString()}));
      },
    });

    const eventHandlers = {
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const pos = marker.getLatLng();
          setFormData(prev => ({...prev, latitude: pos.lat.toString(), longitude: pos.lng.toString()}));
        }
      },
    };

    return formData.latitude && formData.longitude ? (
      <Marker 
        draggable={true}
        eventHandlers={eventHandlers}
        position={[parseFloat(formData.latitude), parseFloat(formData.longitude)]} 
        ref={markerRef}
      />
    ) : null;
  };

  const MapController = ({ center }) => {
    const map = useMap();
    useEffect(() => {
      if (center) map.flyTo(center, map.getZoom());
    }, [center, map]);
    return null;
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire('Error', 'Browser Anda tidak mendukung Geolocation', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapCenter([lat, lng]);
        setFormData(prev => ({...prev, latitude: lat.toString(), longitude: lng.toString()}));
      },
      () => {
        Swal.fire('Error', 'Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.', 'error');
      }
    );
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    setFilteredData(data.filter(d => 
      (d.nama || "").toLowerCase().includes(search.toLowerCase()) || 
      (d.idpel || "").toString().includes(search)
    ));
  }, [search, data]);

  async function loadAllData() {
    setLoading(true);
    try {
      const [resTO, resHist, resUnits, resTarifs] = await Promise.all([
        apiService.getTO(),
        apiService.getAllHistory(),
        apiService.getSettingsUnit(),
        apiService.getSettingsTarif()
      ]);
      
      const histMap = {};
      for (const h of resHist) {
        if (!histMap[h.idpel] || new Date(h.timestamp) > new Date(histMap[h.idpel].timestamp)) {
          histMap[h.idpel] = h;
        }
      }
      setHistoryData(histMap);
      setData(resTO);
      setDbUnits(resUnits);
      setDbTarifs(resTarifs);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const exportExcel = () => {
    if (data.length === 0) {
      return Swal.fire({ icon: 'warning', title: 'Kosong', text: 'Belum ada data untuk diexport!' });
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data TO");
    XLSX.writeFile(wb, "Data_TO.xlsx");
  };

  const downloadTemplate = () => {
    const defaultUnit = dbUnits.length > 0 ? dbUnits[0].nama : "17100";
    const defaultTarif = dbTarifs.length > 0 ? dbTarifs[0].tarif : "R1";
    const ws = XLSX.utils.json_to_sheet([{
      USER: "ADMIN", UNIT: defaultUnit, IDPEL: "123456789012", NAMA: "John Doe", TARIF: defaultTarif, DAYA: "900", ALAMAT: "Jl. Contoh", LATITUDE: "-5.1234", LONGITUDE: "105.1234"
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_TO.xlsx");
  };
  
  const handleResetTO = async () => {
    const result = await Swal.fire({
      title: 'PERINGATAN!',
      text: "Anda yakin ingin MENGHAPUS SEMUA DATA TO? Tindakan ini tidak bisa dibatalkan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal'
    });

    if(result.isConfirmed) {
      const pinResult = await Swal.fire({
        title: 'Konfirmasi Penghapusan',
        input: 'text',
        inputLabel: "Ketik 'RESET' untuk mengonfirmasi:",
        inputPlaceholder: 'RESET',
        showCancelButton: true,
        inputValidator: (value) => {
          if (value !== 'RESET') return 'Konfirmasi salah!';
        }
      });

      if (pinResult.value === 'RESET') {
        setUploading(true);
        try {
          await apiService.resetTO();
          Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Semua data TO berhasil di-reset.' });
          loadAllData();
        } catch(e) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: "Gagal reset data: " + e.message });
        }
        setUploading(false);
      }
    }
  };

  const importExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws);
        
        const defaultUnit = dbUnits.length > 0 ? dbUnits[0].nama : "17100";
        let dataToImport = [];
        for (let row of json) {
          if (row.IDPEL || row.idpel) {
            const idpel = (row.IDPEL || row.idpel).toString();
            dataToImport.push({
              unit: row.UNIT || row.unit || defaultUnit,
              idpel: idpel,
              nama: row.NAMA || row.nama || "",
              tarif: row.TARIF || row.tarif || "",
              daya: row.DAYA || row.daya || "",
              alamat: row.ALAMAT || row.alamat || "",
              latitude: row.LATITUDE || row.latitude || "",
              longitude: row.LONGITUDE || row.longitude || "",
              user: row.USER || row.user || ""
            });
          }
        }
        
        if (dataToImport.length > 0) {
          Swal.fire({
            title: 'Sedang Mengimport...',
            html: 'Memproses <b>0</b> / ' + dataToImport.length + ' data.',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });
          
          await apiService.importTOBatch(dataToImport, (processed, total) => {
            const b = Swal.getHtmlContainer()?.querySelector('b');
            if (b) {
              b.textContent = processed;
            }
          });
          
          Swal.fire({ icon: 'success', title: 'Import Berhasil', text: `Berhasil import ${dataToImport.length} data TO!` });
          loadAllData();
        } else {
          Swal.fire({ icon: 'warning', title: 'Kosong', text: 'Tidak ada data valid yang ditemukan.' });
        }
      } catch(error) {
        Swal.fire({ icon: 'error', title: 'Gagal Import', text: error.message });
      } finally {
        setUploading(false);
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      await apiService.tambahTO(formData, modalMode === 'edit');
      Swal.fire({ icon: 'success', title: 'Berhasil', text: modalMode === 'add' ? 'TO berhasil ditambahkan!' : 'TO berhasil diperbarui!', timer: 2000, showConfirmButton: false });
      setShowModal(false);
      loadAllData();
    } catch(err) {
      Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: err.message });
    }
    setUploading(false);
  };

  const handleDelete = (d) => {
    Swal.fire({
      title: 'Hapus TO?', text: `Yakin menghapus ${d.nama}?`, icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b', confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
      if (result.isConfirmed) {
        apiService.hapusTO(d.idpel).then(() => {
          Swal.fire({icon: 'success', title: 'Dihapus!', showConfirmButton: false, timer: 1500});
          loadAllData();
        });
      }
    });
  };

  const openAdd = () => {
    const defaultUnit = dbUnits.length > 0 ? dbUnits[0].nama : '';
    setFormData({unit: defaultUnit, idpel: '', nama: '', tarif: '', daya: '', alamat: '', latitude: '', longitude: '', user: userObj?.id || 'ADMIN'});
    setModalMode('add');
    setShowModal(true);
  };

  const openEdit = (d) => {
    setFormData(d);
    setModalMode('edit');
    setShowModal(true);
  };

  const selectedTarifObj = dbTarifs.find(t => t.tarif === formData.tarif);
  const dayaOptions = selectedTarifObj ? selectedTarifObj.daya : [];

  return (
    <div className="flex flex-col gap-6 h-full relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Target Operasi (TO)</h1>
          <p className="text-slate-500 mt-1">Kelola data target operasi, unit, lat/long, dan pantau status pengerjaan.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {isAdmin && (
            <>
              <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-medium text-sm">
                <Plus size={16} /> Tambah TO
              </button>
              <label className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow-sm font-medium text-sm">
                <Upload size={16} /> {uploading ? "..." : "Upload"}
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={importExcel} disabled={uploading} />
              </label>
              <button onClick={downloadTemplate} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-medium text-sm">
                <FileSpreadsheet size={16} /> Template
              </button>
              <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-medium text-sm">
                <Download size={16} /> Export
              </button>
              <button onClick={handleResetTO} disabled={uploading} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-medium text-sm disabled:opacity-50">
                <AlertTriangle size={16} /> Reset
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari IDPEL atau Nama..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Menampilkan {filteredData.length} dari {data.length} data
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-800 sticky top-0 font-semibold z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-4">USER</th>
                  <th className="px-4 py-4">UNIT</th>
                  <th className="px-4 py-4">IDPEL</th>
                  <th className="px-4 py-4">NAMA</th>
                  <th className="px-4 py-4">TARIF/DAYA</th>
                  <th className="px-4 py-4">ALAMAT</th>
                  <th className="px-4 py-4">LOKASI</th>
                  <th className="px-4 py-4">STATUS</th>
                  <th className="px-4 py-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((d, i) => {
                  const hist = historyData[d.idpel];
                  const isDone = !!hist;
                  return (
                  <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-4 font-medium">{d.user || "-"}</td>
                    <td className="px-4 py-4">{d.unit || "-"}</td>
                    <td className="px-4 py-4 font-bold text-slate-900">{d.idpel}</td>
                    <td className="px-4 py-4">{d.nama}</td>
                    <td className="px-4 py-4">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
                        {d.tarif} / {d.daya}
                      </span>
                    </td>
                    <td className="px-4 py-4 max-w-[200px] truncate" title={d.alamat}>{d.alamat}</td>
                    <td className="px-4 py-4">
                      {d.latitude && d.longitude ? (
                        <a href={`https://www.google.com/maps?q=${d.latitude},${d.longitude}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-medium">
                          <MapPin size={14} /> Maps
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Belum ada</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {isDone ? (
                         <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">SUDAH</span>
                      ) : (
                         <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">BELUM</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(d)} className="text-blue-500 hover:bg-blue-100 p-2 rounded-lg transition-colors" title="Edit TO">
                          <Edit size={16} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(d)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Hapus TO"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center py-10 text-slate-500">Data tidak ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showPhoto && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm" onClick={() => setShowPhoto(null)}>
          <div className="relative max-w-4xl max-h-full">
            <button className="absolute -top-12 right-0 text-white hover:text-slate-300 font-bold text-xl p-2" onClick={() => setShowPhoto(null)}>Tutup</button>
            <img src={showPhoto} alt="KWH" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} onError={(e) => e.target.src='/placeholder.png'}/>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                {modalMode === 'add' ? 'Tambah Data TO Baru' : 'Edit Data TO'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Kolom 1 */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">User / Petugas</label>
                    <input name="user" value={formData.user} onChange={handleInput} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="ADMIN" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                    <select name="unit" value={formData.unit} onChange={handleInput} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="">-- Pilih Unit --</option>
                      {dbUnits.map(u => <option key={u.nama} value={u.nama}>{u.nama}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IDPEL</label>
                  <input name="idpel" value={formData.idpel} onChange={handleInput} required disabled={modalMode === 'edit'} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                  <input name="nama" value={formData.nama} onChange={handleInput} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tarif</label>
                    <select name="tarif" value={formData.tarif} onChange={(e) => setFormData({...formData, tarif: e.target.value, daya: ''})} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="">Pilih Tarif</option>
                      {dbTarifs.map(t => <option key={t.tarif} value={t.tarif}>{t.tarif}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Daya (VA)</label>
                    <select name="daya" value={formData.daya} onChange={handleInput} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" disabled={!formData.tarif}>
                      <option value="">Pilih Daya</option>
                      {dayaOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Kolom 2 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Lengkap</label>
                  <textarea name="alamat" value={formData.alamat} onChange={handleInput} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" rows="3" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                    <input name="latitude" value={formData.latitude} onChange={handleInput} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                    <input name="longitude" value={formData.longitude} onChange={handleInput} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <button type="button" onClick={() => {
                  if(formData.latitude && formData.longitude) setMapCenter([parseFloat(formData.latitude), parseFloat(formData.longitude)]);
                  setShowMap(true);
                }} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 p-2.5 rounded-lg flex items-center justify-center gap-2 transition font-medium">
                  <Map size={18} /> Pilih Titik Lokasi di Peta
                </button>
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium">
                  Batal
                </button>
                <button type="submit" disabled={uploading} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm font-medium disabled:opacity-50">
                  {uploading ? 'Menyimpan...' : 'Simpan Data TO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {showMap && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl p-5 w-full max-w-4xl shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Pilih Lokasi di Peta</h2>
                <p className="text-sm text-slate-500 mt-1">Klik pada area peta untuk memilih koordinat, atau gunakan tombol lokasi saya.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleGetMyLocation} className="flex items-center gap-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2 rounded-lg font-medium transition">
                  <Crosshair size={18} /> Lokasi Saya
                </button>
                <button type="button" onClick={() => setShowMap(false)} className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 rounded-lg font-medium transition">Tutup</button>
              </div>
            </div>
            
            <div className="w-full h-[60vh] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
              <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationMarker />
                <MapController center={mapCenter} />
              </MapContainer>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowMap(false)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition">Selesai Pilih Lokasi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
