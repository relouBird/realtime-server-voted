import express from "express";
import { createServer } from "node:http";
import cors from "cors"
import { Server } from "socket.io";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
} from "firebase/firestore";
import { config } from "dotenv";

const corsOptions = {
  origin: 'https://google-test-relou.vercel.app',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

const app = express();
app.use(cors(corsOptions))
const server = createServer(app);
const io = new Server(server, {
  cors:  {
    origin: 'https://google-test-relou.vercel.app',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // Augmenter le délai d'attente
  pingInterval: 25000,
  connectionStateRecovery: {},
});

config();

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "voted-web-app-9e54c.firebaseapp.com",
  projectId: "voted-web-app-9e54c",
  storageBucket: "voted-web-app-9e54c.appspot.com",
  messagingSenderId: "213625233671",
  appId: "1:213625233671:web:bdee62afcb0bc157f725a2",
};

// Initialize Firebase
const appFirebase = initializeApp(firebaseConfig);
// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(appFirebase);

let data;
const querySnapshot = await getDocs(collection(db, "users"));
querySnapshot.forEach((doc) => {
  // console.log(`${doc.id} => ${doc.data()}`);
  data = doc.data();
});

let totalVoting = 0;

let votingPolls = {
  "I'am crazy.": 0,
  "I'm good person.": 0,
};

if (data) {
  totalVoting = data.totalVoting;
  votingPolls = data.votingPolls;
}

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.emit("update", { totalVoting, votingPolls });
  socket.on("send-vote", async (vote) => {
    totalVoting++;
    votingPolls[vote]++;
    try {
      const docRef = await setDoc(doc(db, "users", "voting-session"), {
        totalVoting: totalVoting,
        votingPolls: votingPolls,
      });
      console.log("Document written with ID: voting-session");
      const querySnapshot = await getDocs(collection(db, "users"));
      querySnapshot.forEach((doc) => {
        totalVoting = doc.data().totalVoting;
        votingPolls = doc.data().votingPolls;
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
    console.log(vote);
    socket.broadcast.emit("receive-vote", { totalVoting, votingPolls });
    io.emit("update", { totalVoting, votingPolls });
  });

  // ceci est un test
  // permet de creer un user dans la bd
  // socket.emit("update-message", data);
  // socket.on("message", async (message) => {
  //   try {
  //     const docRef = await setDoc(doc(db, "users", "voting-session"), {
  //       userId: message,
  //     });
  //     console.log("Document written with ID: voting-session");
  //     const querySnapshot = await getDocs(collection(db, "users"));
  //     querySnapshot.forEach((doc) => {
  //       data = doc.data();
  //     });
  //   } catch (e) {
  //     console.error("Error adding document: ", e);
  //   }
  //   io.emit("update-message", data);
  // });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(8000, () => {
  console.log("server running at http://localhost:8000");
});
