import {tanks} from "../tanksData/tanks.js";
import {cairoLocations} from "../tanksData/locations.js";
import {PARAMETER_CONFIG} from "../tanksData/parameterConfig.js";
import {checkForAlerts} from "./alerts.js";
import {getParameterStatus} from "./main.js";

document.addEventListener("DOMContentLoaded", function () {
    // Attach event listener to the Add Tank form
    const addTankForm = document.getElementById("addTankForm");
    if (addTankForm) {
        addTankForm.addEventListener("submit", function (event) {
            event.preventDefault();
            handleAddTank(event);
        });
    }

    // Initial rendering of tanks if any exist
    const homePage = document.getElementById("homePage");
    if (homePage && homePage.classList.contains("active")) {
        renderTanks();
    }
});

function handleAddTank(event) {
    event.preventDefault();
    const inputEl = event.target.querySelector("input");
    const newTankId = parseInt(inputEl.value, 10);
    if (isNaN(newTankId)) {
        alert("Please enter a valid Tank ID.");
        return;
    }

    let savedTanks = localStorage.getItem("tanks");
    if (savedTanks) {
        savedTanks = JSON.parse(savedTanks);
    } else {
        savedTanks = [];
    }

    if (savedTanks.find((tank) => tank.id === newTankId)) {
        alert("Tank with ID " + newTankId + " already exists.");
        return;
    }
    const randomLocationIndex = Math.floor(Math.random() * cairoLocations.length);
    const newTank = {
        id: newTankId,
        name: `Tank ${newTankId}`,
        location: cairoLocations[randomLocationIndex],
        ph: 7.0 + Math.random() * 2 - 1,
        do: 6.5 + Math.random() * 3 - 1.5,
        temp: 15 + Math.random() * 8 - 4,
        tds: 500 + Math.random() * 600 - 300,
        turb: 0.8 + Math.random() * 0.4 - 0.2,
        lastUpdate: new Date().toISOString(),
    };


    savedTanks.push(newTank);
    localStorage.setItem("tanks", JSON.stringify(savedTanks));
    renderTanks();
    hideAddTankModal();
    event.target.reset();
    checkForAlerts();
}

// Function to show the Add Tank modal


document.getElementsByClassName('add-tank-btn')[0]?.addEventListener('click', () => {
    const modal = document.getElementById("addTankModal");
    if (modal) {
        modal.classList.add("active");
    } else {
        console.error("Add tank modal not found!");
    }
});

document.getElementsByClassName('close-add-tank-model')[0]?.addEventListener('click', () => {
    hideAddTankModal();
});

function hideAddTankModal() {
    const modal = document.getElementById("addTankModal");
    if (modal) {
        modal.classList.remove("active");
    }
}

export function updateTankData() {
    tanks.forEach((tank) => {
        tank.ph += (Math.random() - 0.5) * 0.2;
        tank.do += (Math.random() - 0.5) * 0.3;
        tank.temp += (Math.random() - 0.5) * 0.5;
        tank.tds += (Math.random() - 0.5) * 50;
        tank.turb += (Math.random() - 0.5) * 0.2;
        tank.lastUpdate = new Date().toISOString();
    });

    tanks.forEach((tank) => {
        const card = document.querySelector(`#tank-${tank.id}`);
        let isFlashing = false;
        Object.entries(PARAMETER_CONFIG).forEach(([param, config]) => {
            const value = tank[param];
            const isOutOfRange = value < config.min || value > config.max;
            if (isOutOfRange) {
                isFlashing = true;
            }
        });

        const devicePage = document.getElementById("dashboardPage");
        if (devicePage && devicePage.classList.contains("active")) {
            if (isFlashing) {
                card.classList.add("flash-card");
            } else {
                card.classList.remove("flash-card");
            }
        }
    });

    renderTanks();
    checkForAlerts();
}

export function renderTanks() {
    const tankGrid = document.getElementById("tankGrid");
    tankGrid.innerHTML = "";
    JSON.parse(localStorage.getItem("tanks")).forEach((tank) => {
        tankGrid.appendChild(createTankCard(tank));
    });
}

function deleteTank(tankId, event) {
    event.stopPropagation();
    let savedTanks = localStorage.getItem("tanks");
    if (savedTanks) {
        savedTanks = JSON.parse(savedTanks);
    }

    const newTanks = savedTanks.filter((tank) => tank.id !== tankId);
    localStorage.setItem("tanks", JSON.stringify(newTanks));
    renderTanks();
}

function createTankCard(tank) {
    const card = document.createElement("div");
    card.className = "tank-card";
    card.id = `tank-${tank.id}`;

    const header = document.createElement("div");
    header.className = "tank-header";
    header.innerHTML = `
    <div style="display: flex; justify-content: space-between">
      <h3 class="tank-title">${tank.name}</h3>
      <div class="icon-button delete-tank">
        <i class="fas fa-times"></i>
      </div>
    </div>
    <div class="tank-location">
      <i class="fas fa-map-marker-alt"></i> ${tank.location}
    </div>
  `;
    card.appendChild(header);

    // Find the delete button inside the header
    const deleteBtn = card.querySelector(".delete-tank");
    deleteBtn.addEventListener("click", (event) => {
        deleteTank(tank.id, event);
    });

    const paramsContainer = document.createElement("div");
    paramsContainer.className = "params-container";
    let isFlashing = false;

    Object.entries(PARAMETER_CONFIG).forEach(([param, config]) => {
        const value = tank[param];
        const status = getParameterStatus(param, value);

        if (value < config.min || value > config.max) {
            isFlashing = true;
        }

        const paramRow = document.createElement("div");
        paramRow.className = "param-row";

        const leftCol = document.createElement("div");
        leftCol.className = "param-left";
        const bar = createParameterBar(param, value, status);
        leftCol.appendChild(bar);

        const rightCol = document.createElement("div");
        rightCol.className = "param-right";

        const idealDiv = document.createElement("div");
        idealDiv.className = "range-ideal";
        idealDiv.textContent = `Ideal: ${config.min} - ${config.max} ${config.unit || ""}`;

        const warningDiv = document.createElement("div");
        warningDiv.className = "range-warning";
        warningDiv.textContent = `Warning: ${config.warningMin} - ${config.warningMax} ${config.unit || ""}`;

        const dangerousDiv = document.createElement("div");
        dangerousDiv.className = "range-dangerous";
        dangerousDiv.textContent = `Dangerous: < ${config.min} or > ${config.max} ${config.unit || ""}`;

        rightCol.appendChild(idealDiv);
        rightCol.appendChild(warningDiv);
        rightCol.appendChild(dangerousDiv);

        paramRow.appendChild(leftCol);
        paramRow.appendChild(rightCol);
        paramsContainer.appendChild(paramRow);
    });

    card.appendChild(paramsContainer);

    if (isFlashing) {
        card.classList.add("flash-card");
    }

    card.addEventListener("click", (e) => {
        if (!e.target.closest(".delete-tank")) {
            window.currentTankId = tank.id;
            window.location.href = 'tank-detail.html?id=' + tank.id;
        }
    });

    return card;
}


function createParameterBar(param, value, status) {
    const paramDiv = document.createElement("div");
    paramDiv.className = "parameter-bar";
    const config = PARAMETER_CONFIG[param];
    const statusColor = status === "green" ? "#22c55e" : status === "yellow" ? "#eab308" : "#ef4444";
    paramDiv.innerHTML = `
          <div class="parameter-icon" style="background-color: ${statusColor}">
            <i class="fas ${config.icon}"></i>
          </div>
          <div class="parameter-info">
            <div class="parameter-name">${config.name}</div>
            <div class="parameter-value">${value.toFixed(1)}${config.unit}</div>
          </div>
        `;
    return paramDiv;
}