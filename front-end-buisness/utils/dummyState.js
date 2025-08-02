let isPaused = false;
let userRole = "user"; // Default role
let currentUid = null; // Track current user ID

export function getIsPaused() {
  return isPaused;
}

export function setIsPaused(value) {
  isPaused = !!value; // Ensure boolean
  console.log(`Dummy state updated: isPaused = ${isPaused}`);
}

export function getUserRole(uid) {
    console.log(currentUid);
  if (!uid || uid !== currentUid) {
    console.log(`No role found for uid: ${uid || "undefined"}`);
    return "user"; // Default to "user" if no valid uid
  }
  return userRole;
}

export function setUserRole(uid, role) {
  currentUid = uid;
  userRole = role || "user"; // Fallback to "user" if role is invalid
  console.log(`Dummy state updated: uid = ${uid}, role = ${userRole}`);
}
