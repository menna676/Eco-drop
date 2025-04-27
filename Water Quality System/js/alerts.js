import {PARAMETER_CONFIG} from "../tanksData/parameterConfig.js";
import {getParameterStatus} from "./main.js";

let alerts = [];
let currentFilter = "all";

export function checkForAlerts() {
    const newAlerts = [];
    const tanksData = localStorage.getItem("tanks");
    const tanks = tanksData ? JSON.parse(tanksData) : [];
    tanks.forEach((tank) => {
        Object.entries(PARAMETER_CONFIG).forEach(([param, config]) => {
            const value = tank[param];
            const status = getParameterStatus(param, value);
            if (status === "yellow" || status === "red") {
                newAlerts.push({
                    id: `${tank.id}-${param}-${Date.now()}`,
                    tankId: tank.id,
                    tankName: tank.name,
                    parameter: config.name,
                    value: value.toFixed(1) + config.unit,
                    status: status === "red" ? "dangerous" : "warning",
                    timestamp: new Date().toISOString(),
                    icon: config.icon,
                });
            }
        });
    });
    alerts = newAlerts.filter((alert) => tanks.some((tank) => tank.id === alert.tankId));
    updateAlertsBadge();

    // Check if the current page is the alerts page
    const alertsPage = document.getElementById("alertsPage");
    if (alertsPage && alertsPage.classList.contains("active")) {
        renderAlerts();
    }
}

checkForAlerts();

function updateAlertsBadge() {
    const alertsButton = document.querySelector(".alerts-button");
    alertsButton && alertsButton.classList.toggle("has-alerts", alerts.length > 0);
    const badge = document.getElementById("notificationCount");
    if (badge) {
        if (alerts.length > 0) {
            badge.textContent = alerts.length;
            badge.classList.remove("hidden");
        } else {
            badge.classList.add("hidden");
        }
    }
}

function renderAlerts() {
    const alertsList = document.getElementById("alertsList");
    const noAlertsElement = document.getElementById("noAlerts");

    const filteredAlerts = alerts.filter((alert) => {
        if (currentFilter === "all") return true;
        return alert.status === currentFilter;
    });

    if (filteredAlerts.length === 0) {
        alertsList.innerHTML = "";
        if (noAlertsElement) noAlertsElement.classList.remove("hidden");
        return;
    }

    if (noAlertsElement) noAlertsElement.classList.add("hidden");

    const fragment = document.createDocumentFragment();

    filteredAlerts.forEach((alert) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = createAlertCard(alert);
        if (tempDiv.firstElementChild) {
            fragment.appendChild(tempDiv.firstElementChild);
        }
    });

    alertsList.innerHTML = "";
    alertsList.appendChild(fragment);
}


function dismissAlert(alertId) {
    alerts = alerts.filter((alert) => alert.id !== alertId);
    const alertElement = document.getElementById(`alert-${alertId}`);
    if (alertElement) {
        alertElement.style.animation = "slideOut 0.3s ease-out";
        setTimeout(() => {
            updateAlertsBadge();
            renderAlerts();
        }, 300);
    }
}


function createAlertCard(alert) {
    const timeString = new Date(alert.timestamp).toLocaleString();
    return `
          <div class="alert-card ${alert.status}" id="alert-${alert.id}">
            <div class="alert-header">
              <div class="alert-status ${alert.status}">
                <i class="fas ${alert.status === "dangerous" ? "fa-exclamation-triangle" : "fa-exclamation-circle"}"></i>
                ${alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
              </div>
              <span class="alert-time">${timeString}</span>
            </div>
            <div class="alert-content">
              <div class="alert-info">
                <div class="alert-tank">${alert.tankName}</div>
                <div class="alert-parameter">
                  <i class="fas ${alert.icon}"></i>
                  ${alert.parameter}: ${alert.value}
                </div>
              </div>
              <div class="alert-actions">
                <button class="icon-button" onclick="dismissAlert('${alert.id}')">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        `;
}