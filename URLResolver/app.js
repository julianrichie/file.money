const express = require('express');
const cors = require('cors');
const app = express();
const whitelistedOrigin = (process.env.CORS_ORIGIN ?? "https://testnet.app.file.money,https://app.file.money").split(",");
app.use(cors({
   origin: function(origin,callback) {
      if (!origin) {
         // NORMAL HTTP REQUEST
         callback(null,true);
         return
      }
      if (whitelistedOrigin.indexOf(origin) !== -1) {
         callback(null,true);
         return
      } else {
         callback(new Error("NOT ALLOWED"));
      }
   }
}));

//INITIALIZE FIREBASE
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

initializeApp({
   storageBucket: "fileismoney.appspot.com"
});
const fsDB = getFirestore();
const fsStorage = getStorage();
const bucket = fsStorage.bucket();

//UTILITY
const DownloadWindowTime = Number(process.env.DOWNLOAD_WINDOW_TIME ?? 1800);
const QueryBlockChain = Boolean(process.env.QUERY_BLOCKCHAIN ?? false);

//WEB3 STUFF
const Web3 = require('web3');
const NodeUrl = "wss://speedy-nodes-nyc.moralis.io/54d9c5d3b5a4b55fc28fc9f0/polygon/mumbai/ws";
const provider = new Web3.providers.WebsocketProvider(NodeUrl);
const w3 = new Web3(provider);
const abi = require('./abi').abi;
const smartContract = new w3.eth.Contract(abi,process.env.CONTRACT_ADDRESS);


function checkToken(req,res,next) {
   const token = req.header("x-filemoney-token");
   if (token && token.length) {
      if (token.length === 0) {
         res.status(400).send({error: "bad request"});
         return
      }
      next();

   } else {
      res.status(400).send({error: "bad request"});
   }
}


/**
Using this method assure the requester is the valid owner of the file(s),
 make sure to use a fast polygon node, because an out of sync node or slow node will always return false for file(s) ownership
 even though the user/wallet already bought it.
* */
async function confirmChain(req,file_id) {
   return new Promise((resolve,reject) => {
      //Set in the environment
      if (!QueryBlockChain) {
         return true;
      }
      const wallet = req.header("x-wallet-address");
      const origin = `https://${req.hostname}`;
      if (whitelistedOrigin.indexOf(origin) !== -1 && wallet === "0x0") {
         // TEST DOWNLOAD FUNCTION ALWAYS USE 0x0 wallet as the requester;
         return true;
      }
      //WEIRD WEB3 behavior
      smartContract.methods.checkOwnership(file_id).call({from: wallet})
          .then(res => {
             return resolve(res);
          })
          .catch(err => {
             return reject(err);
          })
   });
}

app.get("/file/:uid/:fileID",checkToken,async (req,res) => {
   const uid = req.params.uid;
   const fileID = req.params.fileID;
   if ((uid.length === 0) || (fileID.length === 0)) {
      res.status(400).send({error: "incomplete params"});
      return
   }
   const ref = fsDB.collection("users").doc(uid).collection("files").doc(fileID);
   try {
      const doc = await ref.get();
      if (!doc.exists) {
         res.status(404).send({error: "document not found"});
         return
      }
      const data = doc.data();
      if (data.token !== req.header("x-filemoney-token")) {
         res.status(401).send({error: "not found"});
         return
      }
      const gsPath = data.gsPath;
      const file = bucket.file(gsPath);
      Promise.all([
          confirmChain(req,data.fileID),
          file.exists()
      ])
          .then(res => {
             if (!res[0]) {
                return Promise.reject(new Error("not the owner"));
             }
             if (!res[1]) {
                return Promise.reject(new Error("document not exists"));
             }
             let now = new Date();
             now.setSeconds(now.getSeconds() + DownloadWindowTime);
             return file.getSignedUrl({action: "read",expires: now});
          })
          .then(signedURL => {
             if (signedURL && signedURL[0]) {
                res.status(200).send({authenticated_url: signedURL[0]});
                return
             }
             console.log("could not find signed url");
             return Promise.reject(new Error("could not find signed url"));
          })
          .catch(err => {
             res.status(400).send({
                error: err.toString()
             })
          });
   } catch (e) {
      // ERROR GETTING DOCUMENT FROM FIREBASE;
      console.error(e);
      res.status(400).send({error:"internal error occurred"});
      return;
   }
});

app.listen(process.env.LISTEN_PORT,() => {
   console.log("SERVER RUNNING ON PORT:",process.env.LISTEN_PORT);
})