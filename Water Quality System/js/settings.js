const savedEmailAlerts = localStorage.getItem("emailAlerts") === "true";
/*const savedPushNotifications =
  localStorage.getItem("pushNotifications") === "true";*/
document.getElementById("emailToggle").checked = savedEmailAlerts;
/*document.getElementById("pushToggle").checked = savedPushNotifications;*/

document.getElementById("themeToggle").addEventListener("click", () => {
  const isDarkMode = document.documentElement.classList.toggle("dark");
  console.log(isDarkMode);
  localStorage.setItem("darkMode", isDarkMode);
});

document.getElementById("emailToggle").addEventListener("click", () => {
  const emailToggle = document.getElementById("emailToggle");
  localStorage.setItem("emailAlerts", emailToggle.checked);
});

/*document.getElementById("pushToggle").addEventListener("click", () => {
  const pushToggle = document.getElementById("pushToggle");
  localStorage.setItem("pushNotifications", pushToggle.checked);
});*/

document.getElementById("alarmSoundToggle").addEventListener("click", () => {
  const isEnabled = document.getElementById("alarmSoundToggle").checked;
  localStorage.setItem("alarmSoundsEnabled", isEnabled);
  console.log(`Alarm sounds ${isEnabled ? "enabled" : "disabled"}`);
});

document
  .getElementsByClassName("logout-btn")[0]
  .addEventListener("click", () => {
    localStorage.removeItem("isLoggedIn");
    window.location.href = "index.html";
  });
