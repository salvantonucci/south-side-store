// firebase/config.js
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "southside-store.firebaseapp.com",
  projectId: "southside-store",
  storageBucket: "southside-store.appspot.com",
  messagingSenderId: "XXXXXXXXXXXX",
  appId: "1:XXXXXXXXXXXX:web:XXXXXXXXXXXXXX"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
