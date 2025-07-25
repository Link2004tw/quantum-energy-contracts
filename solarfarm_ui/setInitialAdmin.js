//solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json
var admin = require("firebase-admin");

var serviceAccount = require("./solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json");
const { getAuth } = require("firebase-admin/auth");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://solarfarmsystem-default-rtdb.firebaseio.com",
});

// if (!getApps().length) {
//   initializeApp(firebaseConfig);
// }

async function setInitialAdmin() {
  try {
    const uid = "PS0WKnwgB8VoCgi5DpYBKJ0p7nI2"; // Replace with the UID of the user to make admin
    await getAuth().setCustomUserClaims(uid, { role: "admin" });
    const user = await getAuth().getUser(uid);
    console.log(`Admin role set for user ${user.email} (${user.uid})`);
  } catch (error) {
    console.error("Error setting admin role:", error);
  }
}

setInitialAdmin();
