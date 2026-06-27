import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDLiD0TK9ungXLU4u-KtyZth4eeUz95740",
  authDomain: "madape-fcd59.firebaseapp.com",
  projectId: "madape-fcd59",
  storageBucket: "madape-fcd59.firebasestorage.app",
  messagingSenderId: "437956063297",
  appId: "1:437956063297:web:8e3c15d5d1c252a1b1b1b1" // Using a dummy web app id, usually works for Firestore without Analytics
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
