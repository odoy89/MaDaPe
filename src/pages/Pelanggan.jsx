import { useEffect, useState, useRef } from 'react';
import { apiService } from '../api';
import { Search, Download, Upload, MapPin, Plus, FileSpreadsheet, Edit, Trash2, Camera, Map, Image as ImageIcon, Crosshair, History, Eye, X } from 'lucide-react';
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

export default function Pelanggan() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Helper to fix Google Drive image URLs so they can be rendered in <img> tags
  const getSafeImageUrl = (url) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      const match = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        // use lh3 direct endpoint which bypasses the redirect blocking completely
        return `https://lh3.googleusercontent.com/d/${match[1]}=w1000`;
      }
    }
    return url;
  };

  const userStr = localStorage.getItem('user');
  const userObj = userStr ? JSON.parse(userStr) : null;
  const isAdmin = userObj?.akses === 'ADMIN';
  
  // Dynamic Settings Data
  const [dbUnits, setDbUnits] = useState([]);
  const [dbTarifs, setDbTarifs] = useState([]);

  // UI States
  const [showModal, setShowModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [mapCenter, setMapCenter] = useState([-6.200000, 106.816666]);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPelanggan, setSelectedPelanggan] = useState(null);

  const [modalMode, setModalMode] = useState('add');
  const [formData, setFormData] = useState({
    unit: '', idpel: '', nama: '', tarif: '', daya: '', alamat: '', peruntukan: 'RUMAH TANGGA', fotoBangunan: '', 'fotoKwh': '', maps: '', latitude: '', longitude: '', keterangan: ''
  });
  
  const [selectedIds, setSelectedIds] = useState([]);
  
  const handleInput = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const base64 = evt.target.result.split(',')[1]; 
        Swal.fire({ title: 'Mengunggah Foto...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await apiService.uploadFoto(base64, file.type, `${formData.idpel || 'NEW'}_${type}_${Date.now()}`);
        if(res.status) {
          setFormData(prev => ({...prev, [type]: res.url}));
          Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1500, showConfirmButton: false });
        } else {
          Swal.fire({ icon: 'error', title: 'Gagal', text: res.message });
        }
      } catch(err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
      }
    };
    reader.readAsDataURL(file);
  };

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

  async function loadAllData() {
    setLoading(true);
    try {
      const [resData, resUnits, resTarifs] = await Promise.all([
        apiService.getPelanggan(),
        apiService.getSettingsUnit(),
        apiService.getSettingsTarif()
      ]);
      setData(resData);
      setDbUnits(resUnits);
      setDbTarifs(resTarifs);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = data.filter(d => 
    (d.nama || "").toLowerCase().includes(search.toLowerCase()) || 
    (d.idpel || "").toString().includes(search)
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(d => d.idpel));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (idpel) => {
    if (selectedIds.includes(idpel)) {
      setSelectedIds(selectedIds.filter(id => id !== idpel));
    } else {
      setSelectedIds([...selectedIds, idpel]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Swal.fire({
      title: 'Hapus Banyak Data?',
      text: `Yakin menghapus ${selectedIds.length} data pelanggan sekaligus?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Semua!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          for (let id of selectedIds) {
            await apiService.hapusPelanggan(id);
          }
          Swal.fire({icon: 'success', title: 'Dihapus!', text: `${selectedIds.length} data berhasil dihapus.`, showConfirmButton: false, timer: 1500});
          setSelectedIds([]);
          loadAllData();
        } catch (e) {
          Swal.fire({icon: 'error', title: 'Gagal', text: e.message});
          setLoading(false);
        }
      }
    });
  };

  const exportExcel = () => {
    if (data.length === 0) return Swal.fire('Kosong', 'Belum ada data untuk diexport!', 'warning');
    const exportData = data.map(d => ({
      USER: d.user || "",
      UNIT: d.unit || "",
      IDPEL: d.idpel || "",
      NAMA: d.nama || "",
      TARIF: d.tarif || "",
      DAYA: d.daya || "",
      ALAMAT: d.alamat || "",
      LATITUDE: d.latitude || "",
      LONGITUDE: d.longitude || "",
      STATUS: d.peruntukan || "",
      KETERANGAN: d.keterangan || "",
      "FOTO BANGUNAN": d.fotoBangunan || "",
      "FOTO KWH": d.fotoKwh || ""
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Pelanggan");
    XLSX.writeFile(wb, "Data_Pelanggan.xlsx");
  };

  const downloadTemplate = () => {
    const defaultUnit = dbUnits.length > 0 ? dbUnits[0].nama : "17100";
    const defaultTarif = dbTarifs.length > 0 ? dbTarifs[0].tarif : "R1";
    const ws = XLSX.utils.json_to_sheet([{
      UNIT: defaultUnit, IDPEL: "123456789012", NAMA: "John Doe", TARIF: defaultTarif, DAYA: "900", ALAMAT: "Jl. Contoh", PERUNTUKAN: "RUMAH TANGGA", "FOTO BANGUNAN": "", "FOTO KWH METER": "", MAPS: "https://maps.google.com/?q=-5,105", LATITUDE: "-5.1234", LONGITUDE: "105.1234", KETERANGAN: "Pelanggan Baru"
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Pelanggan.xlsx");
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
            const isExist = data.some(d => d.idpel === idpel);
            if (!isExist) {
              dataToImport.push({
                unit: row.UNIT || row.unit || defaultUnit,
                idpel: idpel,
                nama: row.NAMA || row.nama || "",
                tarif: row.TARIF || row.tarif || "",
                daya: row.DAYA || row.daya || "",
                alamat: row.ALAMAT || row.alamat || "",
                peruntukan: row.PERUNTUKAN || row.peruntukan || "RUMAH TANGGA",
                fotoBangunan: row["FOTO BANGUNAN"] || row.fotoBangunan || "",
                fotoKwh: row["FOTO KWH METER"] || row.fotoKwh || "",
                maps: row.MAPS || row.maps || "",
                latitude: row.LATITUDE || row.latitude || "",
                longitude: row.LONGITUDE || row.longitude || "",
                keterangan: row.KETERANGAN || row.keterangan || "",
                user: localStorage.getItem('user_id') || 'ADMIN'
              });
            }
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
          
          await apiService.importPelangganBatch(dataToImport, (processed, total) => {
            const b = Swal.getHtmlContainer()?.querySelector('b');
            if (b) {
              b.textContent = processed;
            }
          });
          
          Swal.fire({ icon: 'success', title: 'Berhasil Import', text: `Berhasil import ${dataToImport.length} data pelanggan!` });
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
      const payload = {
        ...formData,
        user: localStorage.getItem('user_id') || 'ADMIN',
        timestamp: new Date().toISOString()
      };
      await apiService.tambahPelanggan(payload, modalMode === 'edit');
      Swal.fire({ icon: 'success', title: 'Berhasil', text: modalMode === 'add' ? "Pelanggan ditambahkan!" : "Pelanggan diperbarui!", timer: 1500, showConfirmButton: false });
      setShowModal(false);
      loadAllData();
    } catch(err) {
      Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: err.message });
    }
    setUploading(false);
  };

  const openAdd = () => {
    const defUnit = dbUnits.length > 0 ? dbUnits[0].nama : '';
    setFormData({unit: defUnit, idpel: '', nama: '', tarif: '', daya: '', alamat: '', peruntukan: 'RUMAH TANGGA', fotoBangunan: '', 'fotoKwh': '', maps: '', latitude: '', longitude: '', keterangan: ''});
    setModalMode('add');
    setShowModal(true);
  };

  const openEdit = (d) => {
    setFormData(d);
    setModalMode('edit');
    setShowModal(true);
  };

  const viewPhoto = (url) => {
    if (!url) return;
    setLightboxImage(url);
    setShowLightbox(true);
  };

  // Helper for dynamic Daya options
  const selectedTarifObj = dbTarifs.find(t => t.tarif === formData.tarif);
  const dayaOptions = selectedTarifObj ? selectedTarifObj.daya : [];

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Data Pelanggan</h1>
          <p className="text-slate-500 mt-1">Kelola data pelanggan, koordinat peta, dan foto bangunan.</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-medium">
              <Trash2 size={18} />
              Hapus ({selectedIds.length})
            </button>
          )}
          <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-medium">
            <Plus size={18} />
            Tambah Data
          </button>
          <label className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow-sm font-medium">
            <Upload size={18} />
            {uploading ? "Mengunggah..." : "Upload Excel"}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={importExcel} disabled={uploading} />
          </label>
          <button onClick={downloadTemplate} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-medium">
            <FileSpreadsheet size={18} />
            Template Excel
          </button>
          <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm font-medium">
            <Download size={18} />
            Export Data
          </button>
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
            Menampilkan {filtered.length} dari {data.length} data
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-800 sticky top-0 font-semibold z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4">IDPEL</th>
                  <th className="px-6 py-4">Nama Pelanggan</th>
                  <th className="px-6 py-4">Tarif/Daya</th>
                  <th className="px-6 py-4">Lokasi & Alamat</th>
                  <th className="px-6 py-4 text-center">Foto</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d, i) => (
                  <tr key={i} className="hover:bg-blue-50/80 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedIds.includes(d.idpel)}
                        onChange={() => handleSelectOne(d.idpel)}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{d.idpel}</td>
                    <td className="px-6 py-4">{d.nama}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
                        {d.tarif} / {d.daya}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate mb-1" title={d.alamat}>{d.alamat}</div>
                      {d.latitude && d.longitude ? (
                        <a href={`https://www.google.com/maps?q=${d.latitude},${d.longitude}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-medium">
                          <MapPin size={14} /> Buka Maps
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Maps blm ada</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {d.fotoBangunan && d.fotoBangunan.length > 5 ? (
                          <img onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/100x100/eeeeee/999999?text=Error'}} onClick={() => viewPhoto(d.fotoBangunan)} src={getSafeImageUrl(d.fotoBangunan)} alt="Bgn" className="w-10 h-10 object-cover rounded cursor-pointer border border-slate-200 hover:opacity-80" title="Foto Bangunan" />
                        ) : <span className="text-slate-400 font-bold" title="Tidak ada foto bangunan">-</span>}
                        
                        {d.fotoKwh && d.fotoKwh.length > 5 ? (
                          <img onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/100x100/eeeeee/999999?text=Error'}} onClick={() => viewPhoto(d.fotoKwh)} src={getSafeImageUrl(d.fotoKwh)} alt="Kwh" className="w-10 h-10 object-cover rounded cursor-pointer border border-slate-200 hover:opacity-80" title="Foto KWH" />
                        ) : <span className="text-slate-400 font-bold" title="Tidak ada foto KWH">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={async () => {
                            setHistoryLoading(true);
                            setShowHistoryModal(true);
                            try {
                              const hist = await apiService.getHistoryLokasi(d.idpel);
                              setHistoryData(hist);
                            } catch (e) {
                              console.error(e);
                            }
                            setHistoryLoading(false);
                          }}
                          className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 p-2 rounded-lg transition-colors font-medium" title="History Lokasi"
                        >
                          <History size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedPelanggan(d);
                            setShowDetailModal(true);
                          }} 
                          className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 p-2 rounded-lg transition-colors font-medium" 
                          title="Detail Pelanggan"
                        >
                          <Eye size={18} />
                        </button>
                        <button onClick={() => openEdit(d)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors font-medium" title="Edit Data"><Edit size={18} /></button>
                        {isAdmin && (
                          <button 
                            onClick={() => {
                              Swal.fire({
                                title: 'Hapus Pelanggan?', text: `Yakin menghapus ${d.nama}?`, icon: 'warning',
                                showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#64748b', confirmButtonText: 'Ya, Hapus!'
                              }).then((result) => {
                                if (result.isConfirmed) {
                                  apiService.hapusPelanggan(d.idpel).then(() => {
                                    Swal.fire({icon: 'success', title: 'Dihapus!', showConfirmButton: false, timer: 1500});
                                    loadAllData();
                                  });
                                }
                              });
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors font-medium"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-slate-500">Data tidak ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                {modalMode === 'add' ? 'Tambah Data Pelanggan Baru' : 'Edit Data Pelanggan'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Kolom 1 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Unit</label>
                  <select name="unit" value={formData.unit} onChange={handleInput} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Pilih Unit --</option>
                    {dbUnits.map(u => <option key={u.nama} value={u.nama}>{u.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IDPEL</label>
                  <input name="idpel" value={formData.idpel} onChange={handleInput} required disabled={modalMode === 'edit'} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                  <input name="nama" value={formData.nama} onChange={handleInput} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Peruntukan</label>
                  <select name="peruntukan" value={formData.peruntukan} onChange={handleInput} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="RUMAH TANGGA">RUMAH TANGGA</option>
                    <option value="BISNIS">BISNIS</option>
                    <option value="INDUSTRI">INDUSTRI</option>
                    <option value="SOSIAL">SOSIAL</option>
                    <option value="PEMERINTAH">PEMERINTAH</option>
                    <option value="PJU">PJU</option>
                    <option value="PERTANIAN">PERTANIAN</option>
                  </select>
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan Tambahan</label>
                  <textarea name="keterangan" value={formData.keterangan} onChange={handleInput} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" rows="2" />
                </div>
              </div>

              {/* Kolom 2 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Lengkap</label>
                  <textarea name="alamat" value={formData.alamat} onChange={handleInput} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" rows="2" />
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
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 text-center">Foto Bangunan</label>
                    {formData.fotoBangunan ? (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={getSafeImageUrl(formData.fotoBangunan)} className="w-full h-full object-cover" alt="Bangunan" />
                        <button type="button" onClick={() => setFormData({...formData, fotoBangunan: ''})} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Trash2 size={24} /></button>
                      </div>
                    ) : (
                      <label className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition text-slate-500 bg-slate-50">
                        <Camera size={24} className="mb-2 text-slate-400" />
                        <span className="text-xs font-medium">Upload Bangunan</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'fotoBangunan')} />
                      </label>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 text-center">Foto KWH</label>
                    {formData.fotoKwh ? (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={getSafeImageUrl(formData.fotoKwh)} className="w-full h-full object-cover" alt="KWH" />
                        <button type="button" onClick={() => setFormData({...formData, fotoKwh: ''})} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Trash2 size={24} /></button>
                      </div>
                    ) : (
                      <label className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition text-slate-500 bg-slate-50">
                        <Camera size={24} className="mb-2 text-slate-400" />
                        <span className="text-xs font-medium">Upload KWH</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'fotoKwh')} />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition font-medium">
                  Batal
                </button>
                <button type="submit" disabled={uploading} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm font-medium disabled:opacity-50">
                  {uploading ? 'Menyimpan...' : 'Simpan Data Pelanggan'}
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

      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowLightbox(false)}>
          <button className="absolute top-6 right-6 text-white hover:text-slate-300 font-bold text-lg" onClick={() => setShowLightbox(false)}>Tutup</button>
          <img src={getSafeImageUrl(lightboxImage)} onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/400x300/eeeeee/999999?text=Error+Loading+Image'}} alt="Zoom" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      {/* Modal History Lokasi */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-xl my-8 flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-100 pb-4">
              History Lokasi
            </h2>
            <div className="flex-1 min-h-[400px] w-full border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center relative">
              {historyLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : historyData.length > 0 ? (
                <MapContainer center={[parseFloat(historyData[0].latitude), parseFloat(historyData[0].longitude)]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 10 }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {historyData.map((h, i) => (
                    h.latitude && h.longitude && (
                      <Marker key={i} position={[parseFloat(h.latitude), parseFloat(h.longitude)]}>
                        {/* Option: custom popup info */}
                      </Marker>
                    )
                  ))}
                </MapContainer>
              ) : (
                <p className="text-slate-500">Belum ada history lokasi untuk IDPEL ini.</p>
              )}
            </div>
            
            {historyData.length > 0 && !historyLoading && (
              <div className="mt-4 max-h-40 overflow-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2">Tanggal</th>
                      <th className="px-4 py-2">Petugas</th>
                      <th className="px-4 py-2">Lat, Lng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyData.map((h, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">{h.tanggal || '-'}</td>
                        <td className="px-4 py-2">{h.user || '-'}</td>
                        <td className="px-4 py-2">{h.latitude}, {h.longitude}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowHistoryModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg transition font-medium">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedPelanggan && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">Detail Pelanggan</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">ID Pelanggan</p>
                  <p className="font-bold text-slate-900 text-lg">{selectedPelanggan.idpel}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Nama Pelanggan</p>
                  <p className="font-bold text-slate-900 text-lg">{selectedPelanggan.nama}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Unit</p>
                  <p className="font-medium text-slate-800">{selectedPelanggan.unit || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Tarif / Daya</p>
                  <p className="font-medium text-blue-700 bg-blue-50 inline-block px-2 py-1 rounded-md">{selectedPelanggan.tarif} / {selectedPelanggan.daya} VA</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Peruntukan</p>
                  <p className="font-medium text-slate-800">{selectedPelanggan.peruntukan || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Koordinat (Lat, Lng)</p>
                  {selectedPelanggan.latitude && selectedPelanggan.longitude ? (
                    <a href={`https://www.google.com/maps?q=${selectedPelanggan.latitude},${selectedPelanggan.longitude}`} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                      {selectedPelanggan.latitude}, {selectedPelanggan.longitude} <MapPin size={14}/>
                    </a>
                  ) : <p className="font-medium text-slate-400">Belum diatur</p>}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Alamat</p>
                <p className="font-medium text-slate-800 bg-slate-50 p-2 text-sm rounded-lg border border-slate-100">{selectedPelanggan.alamat || '-'}</p>
              </div>

              {selectedPelanggan.keterangan && (
                <div className="mb-4">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Keterangan Tambahan</p>
                  <p className="font-medium text-slate-800 bg-amber-50 p-2 text-sm rounded-lg border border-amber-100">{selectedPelanggan.keterangan}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3 text-center">Foto Bangunan</p>
                  {selectedPelanggan.fotoBangunan && selectedPelanggan.fotoBangunan.length > 5 ? (
                    <img src={getSafeImageUrl(selectedPelanggan.fotoBangunan)} onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/400x300/eeeeee/999999?text=Error+Loading+Image'}} alt="Bangunan" className="w-full h-40 object-cover rounded-lg shadow-sm" />
                  ) : (
                    <div className="w-full h-40 bg-slate-50 rounded-lg flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon size={32} className="mb-2 opacity-50"/>
                      <span className="text-sm">Tidak ada foto</span>
                    </div>
                  )}
                  {selectedPelanggan.fotoBangunan && selectedPelanggan.fotoBangunan.length > 5 && (
                    <a href={selectedPelanggan.fotoBangunan} target="_blank" rel="noreferrer" className="block text-center text-blue-600 text-sm mt-2 hover:underline">Buka foto ukuran penuh</a>
                  )}
                </div>
                
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3 text-center">Foto KWH Meter</p>
                  {selectedPelanggan.fotoKwh && selectedPelanggan.fotoKwh.length > 5 ? (
                    <img src={getSafeImageUrl(selectedPelanggan.fotoKwh)} onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/400x300/eeeeee/999999?text=Error+Loading+Image'}} alt="KWH" className="w-full h-40 object-cover rounded-lg shadow-sm" />
                  ) : (
                    <div className="w-full h-40 bg-slate-50 rounded-lg flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon size={32} className="mb-2 opacity-50"/>
                      <span className="text-sm">Tidak ada foto</span>
                    </div>
                  )}
                  {selectedPelanggan.fotoKwh && selectedPelanggan.fotoKwh.length > 5 && (
                    <a href={selectedPelanggan.fotoKwh} target="_blank" rel="noreferrer" className="block text-center text-blue-600 text-sm mt-2 hover:underline">Buka foto ukuran penuh</a>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button onClick={() => setShowDetailModal(false)} className="px-6 py-2 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
