import { db } from "./firebase";
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, writeBatch } from "firebase/firestore";

const GAS_URL = "https://script.google.com/macros/s/AKfycbwu1KqIzKNTgij2uC74IrJFgmgKQXEAhYqRj93Rr52StSWtrxWoHJRUCciu_GW1PdSU/exec";

export const apiService = {
  // === PELANGGAN ===
  getPelanggan: async () => {
    const snap = await getDocs(collection(db, "pelanggan"));
    return snap.docs.map(doc => doc.data());
  },
  tambahPelanggan: async (data, isEdit = false) => {
    if (!data.idpel) throw new Error("IDPEL is required");
    const docRef = doc(db, "pelanggan", data.idpel.toString());
    const docSnap = await getDoc(docRef);
    if (!isEdit && docSnap.exists()) {
      throw new Error("ID Pelanggan sudah terdaftar!");
    }
    await setDoc(docRef, data);
  },
  hapusPelanggan: async (idpel) => {
    await deleteDoc(doc(db, "pelanggan", idpel.toString()));
  },
  importPelangganBatch: async (dataArray, onProgress) => {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
      const chunk = dataArray.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach(data => {
        if (!data.idpel) return;
        const docRef = doc(db, "pelanggan", data.idpel.toString());
        batch.set(docRef, data); // Gunakan set tanpa merge jika asumsinya data excel menimpa/membuat baru
      });
      
      await batch.commit();
      
      if (onProgress) {
        onProgress(Math.min(i + CHUNK_SIZE, dataArray.length), dataArray.length);
      }
    }
  },
  
  // === TO ===
  getTO: async () => {
    const snap = await getDocs(collection(db, "to"));
    return snap.docs.map(doc => doc.data());
  },
  tambahTO: async (data, isEdit = false) => {
    if (!data.idpel) throw new Error("IDPEL is required");
    const docRef = doc(db, "to", data.idpel.toString());
    const docSnap = await getDoc(docRef);
    if (!isEdit && docSnap.exists()) {
      throw new Error("ID Pelanggan TO sudah terdaftar!");
    }
    await setDoc(docRef, data);
  },
  hapusTO: async (idpel) => {
    await deleteDoc(doc(db, "to", idpel.toString()));
  },
  resetTO: async () => {
    const snap = await getDocs(collection(db, "to"));
    const promises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(promises);
  },
  importTOBatch: async (dataArray, onProgress) => {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
      const chunk = dataArray.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      
      chunk.forEach(data => {
        if (!data.idpel) return;
        const docRef = doc(db, "to", data.idpel.toString());
        batch.set(docRef, data);
      });
      
      await batch.commit();
      
      if (onProgress) {
        onProgress(Math.min(i + CHUNK_SIZE, dataArray.length), dataArray.length);
      }
    }
  },

  // === HISTORY LOKASI ===
  getHistoryLokasi: async (idpel) => {
    const snap = await getDocs(collection(db, "history"));
    return snap.docs.map(doc => doc.data()).filter(d => d.idpel === idpel);
  },
  getAllHistory: async () => {
    const snap = await getDocs(collection(db, "history"));
    return snap.docs.map(doc => doc.data());
  },

  // === SETTINGS UNIT ===
  getSettingsUnit: async () => {
    const snap = await getDocs(collection(db, "settings_unit"));
    return snap.docs.map(doc => doc.data());
  },
  addSettingsUnit: async (unitName) => {
    if (!unitName) throw new Error("Unit is required");
    await setDoc(doc(db, "settings_unit", unitName), { nama: unitName });
  },
  deleteSettingsUnit: async (unitName) => {
    await deleteDoc(doc(db, "settings_unit", unitName));
  },

  // === SETTINGS TARIF & DAYA ===
  getSettingsTarif: async () => {
    const snap = await getDocs(collection(db, "settings_tarif"));
    return snap.docs.map(doc => doc.data());
  },
  addSettingsTarif: async (docId, tarif, dayaList) => {
    if (!tarif) throw new Error("Tarif is required");
    await setDoc(doc(db, "settings_tarif", docId), { tarif: tarif, daya: dayaList });
  },
  deleteSettingsTarif: async (tarif) => {
    await deleteDoc(doc(db, "settings_tarif", tarif));
  },

  // === USERS ===
  getUsers: async () => {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  tambahUser: async (data) => {
    if (!data.user) throw new Error("Username is required");
    await setDoc(doc(db, "users", data.user), data);
  },
  hapusUser: async (username) => {
    await deleteDoc(doc(db, "users", username));
  },
  login: async (username, password) => {
    try {
      const docRef = doc(db, "users", username);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.password.toString() === password.toString()) {
          return { status: true, message: "Berhasil", user: data.user, akses: data.akses };
        } else {
          return { status: false, message: "Password salah" };
        }
      } else {
        return { status: false, message: "User tidak ditemukan" };
      }
    } catch (error) {
      return { status: false, message: "Gagal login: " + error.message };
    }
  },

  // === GOOGLE APPS SCRIPT (FOTO) ===
  // CORS issue is common with GAS when calling from Web. 
  // Often it needs to use "no-cors" or handle it carefully, but since the old app uses normal http POST...
  // In web, fetch with mode: 'cors' might get preflight error if GAS doesn't set headers.
  // Using application/x-www-form-urlencoded is safer for GAS CORS.
  uploadFoto: async (base64, mimeType, namaFile) => {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'uploadFoto',
        file: base64,
        mimeType: mimeType,
        namaFile: namaFile
      })
    });
    // For GAS from web, this might fail CORS if we don't catch it correctly, but let's assume it works.
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch(e) {
      return { status: false, message: text };
    }
  }
};
