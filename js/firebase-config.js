const firebaseConfig = {
  apiKey:            "AIzaSyB4NLK2Bgtl4XvpxXDRt7ejnJkU1Lps17I",
  authDomain:        "casa-lean-clt.firebaseapp.com",
  projectId:         "casa-lean-clt",
  storageBucket:     "casa-lean-clt.firebasestorage.app",
  messagingSenderId: "11622754582",
  appId:             "1:11622754582:web:36fb1cd85a8c4b8ca40837"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();
