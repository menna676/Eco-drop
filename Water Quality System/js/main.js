import { checkProtectedRoute } from "./auth.js";
import { updateTankData } from "./device.js";
import { PARAMETER_CONFIG } from "../tanksData/parameterConfig.js";
import { tanks } from "../tanksData/tanks.js";

const pages = {
  main: document.getElementById("mainPage"),
  loading: document.getElementById("loadingScreen"),
  login: document.getElementById("loginPage"),
  signup: document.getElementById("signupPage"),
  home: document.getElementById("homePage"),
  tankDetail: document.getElementById("tankDetailPage"),
  settings: document.getElementById("settingsPage"),
  forgotPassword: document.getElementById("forgotPasswordPage"),
  alerts: document.getElementById("alertsPage"),
  dashboard: document.getElementById("dashboardPage"),
};

// Check if the current route is protected
checkProtectedRoute(window.location.pathname);

// Initialize application
document.addEventListener("DOMContentLoaded", function () {
  // check if there are tanks in the local storage, if not add the default tanks
  const tanksData = localStorage.getItem("tanks");
  if (!tanksData) {
    localStorage.setItem("tanks", JSON.stringify(tanks));
  }

  const savedDarkMode = localStorage.getItem("darkMode");
  if (
    savedDarkMode === "true" ||
    (!savedDarkMode &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");

    const settingsPage = document.getElementById("settingsPage");
    if (settingsPage && settingsPage.classList.contains("active")) {
      document.getElementById("themeToggle").checked = true;
    }
  }

  const alarmSoundsEnabled =
    localStorage.getItem("alarmSoundsEnabled") !== "false";
  const alarmToggle = document.getElementById("alarmSoundToggle");
  if (alarmToggle) {
    alarmToggle.checked = alarmSoundsEnabled;
  }
  setInterval(updateAlarmStatus, 1);
});

export function showLoading() {
  hideAllPages();
  const loadingScreen = document.getElementById("loadingScreen");
  if (loadingScreen) {
    loadingScreen.classList.add("active");
    console.log("Loading screen activated");
  } else {
    console.error("Loading screen element not found");
  }
}

function hideAllPages() {
  Object.values(pages).forEach(
    (page) => page && page.classList.remove("active")
  );
}

export function getParameterStatus(param, value) {
  const config = PARAMETER_CONFIG[param];
  if (value >= config.min && value <= config.max) return "green";
  if (value >= config.warningMin && value <= config.warningMax) return "yellow";
  return "red";
}

// Function to handle the toggle switch for alarm sounds
/*document.addEventListener("click", function startMonitoringOnce() {
  setInterval(updateAlarmStatus, 1);
  document.removeEventListener("click", startMonitoringOnce);
});*/
setInterval(updateAlarmStatus, 1);

let alarmAudio = new Audio("assets/mixkit-warning-alarm-buzzer-991.wav");
alarmAudio.loop = true;

// Function to update the alarm status based on tank data
function updateAlarmStatus() {
  const currentPath = window.location.pathname;
  if (
    !currentPath.includes("login.html") &&
    !currentPath.includes("signup.html") &&
    !currentPath.includes("forgot-password.html") &&
    !currentPath.includes("index.html")
  ) {
    const alarmEnabled = localStorage.getItem("alarmSoundsEnabled") !== "false";
    const tanksData = localStorage.getItem("tanks");
    const tanks = tanksData ? JSON.parse(tanksData) : [];

    let shouldPlayAlarm = false;

    tanks.forEach((tank) => {
      for (const [param, config] of Object.entries(PARAMETER_CONFIG)) {
        const value = tank[param];
        const status = getParameterStatus(param, value);
        if (status === "yellow" || status === "red") {
          shouldPlayAlarm = true;
          break;
        }
      }
    });

    if (alarmEnabled && shouldPlayAlarm) {
      if (alarmAudio.paused) {
        alarmAudio.play().catch((err) => {
          console.error("Error playing alarm:", err);
        });
      }
    } else {
      if (!alarmAudio.paused) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
      }
    }
  }
}

setInterval(updateTankData, 10000);
setInterval(updateAlarmStatus, 1);
