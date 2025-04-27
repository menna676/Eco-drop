import { dashboardParameters } from "../tanksData/dashboardParameters.js";

let selectedParameter = "PH";
let viewType = "week";
let customData = null;
let activeChart = null;

const parameterSelect = document.getElementById("parameter-select");
const parameterName = document.getElementById("parameter-name");
const parameterRange = document.getElementById("parameter-range");
const parameterNameInfo = document.getElementById("parameter-name-info");
const gaugeProgress = document.getElementById("gauge-progress");
const gaugeValue = document.getElementById("gauge-value");
const dataTitle = document.getElementById("data-title");
const customRange = document.getElementById("custom-range");
const chartContainer = document.getElementById("chart-container");
const viewHourButton = document.getElementById("view-hour-button");
const infoModal = document.getElementById("info-modal");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalRange = document.getElementById("modal-range");
const modalFixInfo = document.getElementById("modal-fix-info");

document.addEventListener("DOMContentLoaded", function () {
  const dashboardTankIdInput = document.getElementById("dashboardTankIdInput");
  if (dashboardTankIdInput) {
    dashboardTankIdInput.addEventListener("change", function () {
      const tankId = parseInt(this.value, 10);
      if (!isNaN(tankId)) {
        updateDashboardForTank(tankId);
      } else {
        alert("Please enter a valid Tank ID.");
      }
    });
  }

  const parameterSelect = document.getElementById("parameterSelect");
  if (parameterSelect) {
    const storedParam = localStorage.getItem("selectedParameter");
    if (storedParam) {
      parameterSelect.value = storedParam;
      selectedParameter = storedParam;
    }
    parameterSelect.addEventListener("change", function () {
      const chosenParam = this.value;
      localStorage.setItem("selectedParameter", chosenParam);
      localStorage.setItem("selectedParameterDisplayName", this.value);

      selectedParameter = chosenParam;
      updateParameterInfo();
      updateChart();
    });
  }
});

function initDashboard() {
  console.log("Initializing dashboard");

  if (!parameterSelect || !parameterName || !chartContainer) {
    console.error("Required dashboard elements not found");
    return;
  }

  const storedParamId = localStorage.getItem("selectedParameter");
  const storedDisplayName = localStorage.getItem(
    "selectedParameterDisplayName"
  );
  const storedValue = localStorage.getItem("currentParameterValue");

  console.log(
    `Retrieved from localStorage: param=${storedParamId}, displayName=${storedDisplayName}, value=${storedValue}`
  );

  if (storedParamId && storedDisplayName) {
    selectedParameter = storedDisplayName;

    if (parameterSelect) {
      parameterSelect.value = selectedParameter;
    }

    if (storedValue && !isNaN(parseFloat(storedValue))) {
      const paramValue = parseFloat(storedValue);

      if (dashboardParameters[selectedParameter]) {
        dashboardParameters[selectedParameter].currentValue = paramValue;
        console.log(
          `Updated ${selectedParameter} value to ${paramValue} in dashboardParameters`
        );
      } else {
        console.error(
          `Parameter ${selectedParameter} not found in dashboardParameters`
        );
      }
    }
  }

  attachDashboardEventListeners();
  updateParameterInfo();
  createTooltip();
  updateChart();
}

initDashboard();

function updateDashboardForTank(tankId) {
  const tanks = JSON.parse(localStorage.getItem("tanks")) || [];
  const tank = tanks.find((t) => t.id === tankId);
  if (!tank) {
    alert("Tank with ID " + tankId + " does not exist.");
    return;
  }
  window.currentTankId = tankId;
  localStorage.setItem("selectedTankId", tankId);
  dashboardParameters.PH.currentValue = tank.ph;
  dashboardParameters.DO.currentValue = tank.do;
  dashboardParameters.TEMP.currentValue = tank.temp;
  dashboardParameters.TDS.currentValue = tank.tds;
  dashboardParameters.TURB.currentValue = tank.turb;

  updateParameterInfo();
  updateChart();
}

function updateParameterInfo() {
  const param = dashboardParameters[selectedParameter];
  parameterName.textContent = selectedParameter;
  parameterRange.textContent = `${param.min} - ${param.max} ${param.unit}`;
  parameterNameInfo.textContent = selectedParameter;
  gaugeValue.textContent = param.unit
    ? `${param.currentValue.toFixed(2)} ${param.unit}`
    : param.currentValue.toFixed(2);
  const percentage = (param.currentValue - param.min) / (param.max - param.min);
  const clampedPercentage = Math.max(0, Math.min(1, percentage));
  gaugeProgress.setAttribute(
    "stroke-dasharray",
    `${clampedPercentage * 251} 251`
  );
  gaugeProgress.setAttribute("stroke", getStatusColor());
}

function updateChart() {
  if (activeChart) {
    activeChart.destroy();
  }
  const data = getCurrentData();
  chartContainer.innerHTML = '<canvas id="chartCanvas"></canvas>';
  const canvas = document.getElementById("chartCanvas");
  const ctx = canvas.getContext("2d");
  const statusColor = "#800080";
  const param = dashboardParameters[selectedParameter];
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, `${statusColor}99`);
  gradient.addColorStop(1, `${statusColor}33`);
  let chartType = "";
  let chartData = {};
  let chartOptions = {};
  if (viewType === "week" || viewType === "lastWeek") {
    dataTitle.textContent =
      viewType === "week" ? "Weekly Data" : "Last Week Data";
    chartType = "bar";
    chartData = {
      labels: data.map((item) => item.day),
      datasets: [
        {
          label: `${selectedParameter} ${param.unit}`,
          data: data.map((item) => item.value),
          backgroundColor: gradient,
          borderColor: statusColor,
          borderWidth: 2,
          borderRadius: 4,
          hoverBackgroundColor: statusColor,
          barPercentage: 0.6,
        },
      ],
    };
    chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: "easeOutQuart" },
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: {
          enabled: false,
          external: (context) => {
            const tooltipModel = context.tooltip;

            let tooltipEl = document.getElementById("chartTooltip");
            if (!tooltipEl) {
              tooltipEl = createTooltip();
            }
            if (tooltipModel.opacity === 0) {
              tooltipEl.style.opacity = "0";
              return;
            }
            if (tooltipModel.body) {
              const dataPoint = tooltipModel.dataPoints[0];
              const value = dataPoint.raw;
              const day = data[dataPoint.dataIndex].day;
              tooltipEl.innerHTML = `
                      <div>
                        <strong>Day: ${day}</strong><br>
                        <strong>${selectedParameter}: ${value} ${param.unit}</strong>
                      </div>
                    `;
            }
            const canvas = context.chart.canvas;
            const rect = canvas.getBoundingClientRect();
            const mouseX = context.chart.tooltip.caretX;
            const mouseY = context.chart.tooltip.caretY;

            const x =
              rect.left +
              window.pageXOffset +
              mouseX -
              tooltipEl.offsetWidth / 2;
            const y = rect.top + window.pageYOffset + mouseY + 10;

            tooltipEl.style.opacity = "1";
            tooltipEl.style.left = x + "px";
            tooltipEl.style.top = y + "px";
          },
        },
      },

      scales: {
        x: {
          title: {
            display: true,
            text: "Day of Week",
            font: { size: 14, weight: "bold" },
            color: "#333",
          },
          grid: { display: false },
        },
        y: {
          title: {
            display: true,
            text: `${selectedParameter} (${param.unit})`,
            font: { size: 14, weight: "bold" },
            color: "#333",
          },
          beginAtZero: param.min === 0,
          min: param.warningMin,
          max: param.warningMax + 5,
          ticks: {
            stepSize: (param.max - param.min) / 5,
            callback: (value) =>
              value.toFixed(1) + (param.unit ? ` ${param.unit}` : ""),
          },
          grid: { color: "rgba(0, 0, 0, 0.1)" },
        },
      },
    };
  } else {
    dataTitle.textContent =
      viewType === "hour"
        ? "Hourly Data"
        : viewType === "month"
        ? "Monthly Data"
        : "Custom Data";
    chartType = "line";
    const labels =
      viewType === "hour"
        ? data.map((item) => item.hour)
        : data.map((item) => item.date);
    chartData = {
      labels: labels,
      datasets: [
        {
          label: `${selectedParameter} ${param.unit}`,
          data: data.map((item) => item.value),
          borderColor: statusColor,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: statusColor,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: statusColor,
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
        },
      ],
    };
    chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: "easeOutQuart" },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: {
          enabled: false,
          external: (context) => {
            const tooltipModel = context.tooltip;
            let tooltipEl = document.getElementById("chartTooltip");
            if (!tooltipEl) {
              tooltipEl = createTooltip();
            }
            if (tooltipModel.opacity === 0) {
              tooltipEl.style.opacity = "0";
              return;
            }
            if (tooltipModel.body) {
              const dataPoint = tooltipModel.dataPoints[0];
              const value = dataPoint.raw;
              const label = dataPoint.label;
              tooltipEl.innerHTML = `
                      <div>
                        <strong>${
                          viewType === "hour" ? "Time" : "Date"
                        }: ${label}</strong><br>
                        <strong>${selectedParameter}: ${value} ${
                param.unit
              }</strong><br>
                        <small>Status: ${
                          value >= param.min && value <= param.max
                            ? "Good"
                            : "Needs Attention"
                        }</small>
                      </div>
                    `;
            }

            const canvas = context.chart.canvas;
            const rect = canvas.getBoundingClientRect();
            const mouseX = context.chart.tooltip.caretX;
            const mouseY = context.chart.tooltip.caretY;
            const x =
              rect.left +
              window.pageXOffset +
              mouseX -
              tooltipEl.offsetWidth / 2;
            const y = rect.top + window.pageYOffset + mouseY + 10;

            tooltipEl.style.opacity = "1";
            tooltipEl.style.left = x + "px";
            tooltipEl.style.top = y + "px";
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: viewType === "hour" ? "Time" : "Date",
            font: { size: 14, weight: "bold" },
            color: "#333",
          },
          grid: { display: false },
        },
        y: {
          title: {
            display: true,
            text: `${selectedParameter} (${param.unit})`,
            font: { size: 14, weight: "bold" },
            color: "#333",
          },
          beginAtZero: param.min === 0,
          min: param.warningMin,
          max: param.warningMax + 5,
          ticks: {
            stepSize: (param.max - param.min) / 5,
            callback: (value) =>
              value.toFixed(1) + (param.unit ? ` ${param.unit}` : ""),
          },
          grid: { color: "rgba(0, 0, 0, 0.1)" },
        },
      },
    };
  }
  activeChart = new Chart(ctx, {
    type: chartType,
    data: chartData,
    options: chartOptions,
  });
  if (activeChart) {
    const param = dashboardParameters[selectedParameter];
    activeChart.options.plugins.annotation = {
      annotations: {
        minLine: {
          type: "line",
          yMin: param.min,
          yMax: param.min,
          borderColor: "rgba(0, 123, 255, 0.5)",
          borderWidth: 2,
          borderDash: [6, 6],
          label: {
            content: `Min: ${param.min}${param.unit}`,
            enabled: true,
            position: "start",
          },
        },
        maxLine: {
          type: "line",
          yMin: param.max,
          yMax: param.max,
          borderColor: "rgba(220, 53, 69, 0.5)",
          borderWidth: 2,
          borderDash: [6, 6],
          label: {
            content: `Max: ${param.max}${param.unit}`,
            enabled: true,
            position: "end",
          },
        },
      },
    };
    activeChart.update();
  }
  canvas.onclick = function (evt) {
    const points = activeChart.getElementsAtEventForMode(
      evt,
      "nearest",
      { intersect: true },
      true
    );
    if (points.length) {
      const firstPoint = points[0];
      const label = activeChart.data.labels[firstPoint.index];
      const value = activeChart.data.datasets[0].data[firstPoint.index];
      const timePeriod = viewType === "hour" ? "Time" : "Date/Day";
      showDataPointModal(label, value, timePeriod);
    }
  };
}

function getStatusColor() {
  const param = dashboardParameters[selectedParameter];
  const value = param.currentValue;
  if (value >= param.min && value <= param.max) return "#4CD964";
  if (value >= param.warningMin && value <= param.warningMax) return "#FFCC00";
  return "#FF3B30";
}

function getCurrentData() {
  const param = dashboardParameters[selectedParameter];
  if (viewType === "week") {
    return param.weeklyData;
  } else if (viewType === "hour") {
    const hourlyData = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourLabel = hour.toString().padStart(2, "0") + ":00";
      const randomVariance =
        (Math.random() - 0.5) * (param.max - param.min) * 0.2;
      const value = Math.max(
        param.min,
        Math.min(param.max * 1.2, param.currentValue + randomVariance)
      );
      hourlyData.push({ hour: hourLabel, value: parseFloat(value.toFixed(2)) });
    }
    return hourlyData;
  } else if (viewType === "month") {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthlyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const randomVariance =
        (Math.random() - 0.5) * (param.max - param.min) * 0.2;
      const value = Math.max(
        param.min,
        Math.min(param.max * 1.2, param.currentValue + randomVariance)
      );
      monthlyData.push({
        date: day.toString().padStart(2, "0"),
        value: parseFloat(value.toFixed(2)),
      });
    }
    return monthlyData;
  } else if (viewType === "lastWeek") {
    return param.lastWeekData;
  } else if (viewType === "custom" && customData) {
    return customData;
  }
  return param.weeklyData;
}

function createTooltip() {
  if (document.getElementById("chartTooltip")) {
    document.getElementById("chartTooltip").remove();
  }

  const tooltipEl = document.createElement("div");
  tooltipEl.id = "chartTooltip";

  tooltipEl.style.position = "absolute";
  tooltipEl.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  tooltipEl.style.color = "white";
  tooltipEl.style.padding = "8px";
  tooltipEl.style.borderRadius = "4px";
  tooltipEl.style.pointerEvents = "none";
  tooltipEl.style.zIndex = "1000";
  tooltipEl.style.fontSize = "14px";
  tooltipEl.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
  tooltipEl.style.transition = "opacity 0.3s ease";
  tooltipEl.style.opacity = "0";
  tooltipEl.style.top = "0";
  tooltipEl.style.left = "0";
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function showDataPointModal(label, value, timePeriod) {
  let dataPointModal = document.getElementById("dataPointModal");
  if (!dataPointModal) {
    dataPointModal = document.createElement("div");
    dataPointModal.id = "dataPointModal";
    dataPointModal.style.display = "none";
    dataPointModal.style.position = "fixed";
    dataPointModal.style.top = "0";
    dataPointModal.style.left = "0";
    dataPointModal.style.width = "100%";
    dataPointModal.style.height = "100%";
    dataPointModal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    dataPointModal.style.zIndex = "1001";
    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";
    modalContent.style.backgroundColor = "white";
    modalContent.style.margin = "15% auto";
    modalContent.style.padding = "30px";
    modalContent.style.width = "80%";
    modalContent.style.maxWidth = "500px";
    modalContent.style.borderRadius = "10px";
    modalContent.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    modalContent.style.color = "#333";
    modalContent.style.position = "relative";
    dataPointModal.appendChild(modalContent);
    document.body.appendChild(dataPointModal);
    dataPointModal.onclick = function (event) {
      if (event.target === dataPointModal) {
        dataPointModal.style.display = "none";
      }
    };
  }
  const param = dashboardParameters[selectedParameter];
  const modalContent = dataPointModal.querySelector(".modal-content");
  let statusText =
    value >= param.min && value <= param.max
      ? "Good"
      : value >= param.warningMin && value <= param.warningMax
      ? "Warning"
      : "Dangerous";
  let statusColor =
    value >= param.min && value <= param.max
      ? "#4CD964"
      : value >= param.warningMin && value <= param.warningMax
      ? "#FFCC00"
      : "#FF3B30";
  modalContent.innerHTML = `
          <button style="position: absolute; top: 10px; right: 10px; border: none; background: none; font-size: 24px; cursor: pointer;">&times;</button>
          <h2 style="color: #007bff; margin-top: 0;">${selectedParameter} Data Point</h2>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div>
              <strong>${timePeriod}:</strong> ${label}
            </div>
            <div>
              <strong>Value:</strong> ${value} ${param.unit}
            </div>
          </div>
          <div style="margin-bottom: 15px;">
            <div style="height: 10px; background-color: #f0f0f0; border-radius: 5px; overflow: hidden;">
              <div style="height: 100%; width: ${
                ((value - param.min) / (param.max - param.min)) * 100
              }%; background-color: ${statusColor}; border-radius: 5px;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
              <small>Min: ${param.min}${param.unit}</small>
              <small>Max: ${param.max}${param.unit}</small>
            </div>
          </div>
          <div style="margin-top: 15px;">
            <strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
          </div>
          <div style="margin-top: 15px;">
            <strong>Recommendation:</strong>
            ${
              value >= param.min && value <= param.max
                ? "Current value is within ideal range. Continue to monitor."
                : value < param.min
                ? `Value is too low. ${param.fixInfo}`
                : `Value is too high. ${param.fixInfo}`
            }
          </div>
        `;
  const closeBtn = modalContent.querySelector("button");
  closeBtn.onclick = function () {
    dataPointModal.style.display = "none";
  };
  dataPointModal.style.display = "block";
}

function attachDashboardEventListeners() {
  if (parameterSelect) {
    parameterSelect.addEventListener("change", (e) => {
      selectedParameter = e.target.value;
      updateParameterInfo();
      updateChart();
    });
  }

  document
    .querySelectorAll(".view-btn, #week-tab, #last-week-tab, #month-tab")
    .forEach((button) => {
      button.addEventListener("click", function () {
        viewType =
          this.getAttribute("data-view") || this.id.replace("-tab", "");
        updateChart();
        document
          .querySelectorAll(".view-btn, #week-tab, #last-week-tab, #month-tab")
          .forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");
      });
    });

  if (viewHourButton) {
    viewHourButton.addEventListener("click", () => {
      viewType = "hour";
      updateChart();
    });
  }

  if (customRange) {
    customRange.addEventListener("click", () => {
      const startDate = document.getElementById("start-date").value;
      const endDate = document.getElementById("end-date").value;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      if (dayDiff <= 0) {
        alert("End date must be after start date");
        return;
      }
      const newData = [];
      for (let i = 0; i <= dayDiff; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = `${(currentDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${currentDate
          .getDate()
          .toString()
          .padStart(2, "0")}`;
        const param = dashboardParameters[selectedParameter];
        const baseValue = param.currentValue;
        const randomVariance =
          (Math.random() - 0.5) * (param.max - param.min) * 0.2;
        const value = Math.max(
          param.min,
          Math.min(param.max * 1.2, baseValue + randomVariance)
        );
        newData.push({ date: dateStr, value: parseFloat(value.toFixed(2)) });
      }
      customData = newData;
      viewType = "custom";
      updateChart();
    });
  }

  if (infoModal) {
    document
      .getElementById("info-button")
      .addEventListener("click", showInfoModal);
    window.addEventListener("click", (e) => {
      if (e.target === infoModal) infoModal.style.display = "none";
    });
  }
}

function showInfoModal() {
  const param = dashboardParameters[selectedParameter];
  modalTitle.textContent = selectedParameter;
  modalDescription.textContent = param.description;
  modalRange.textContent = `${param.min} - ${param.max} ${param.unit}`;
  modalFixInfo.textContent = param.fixInfo;
  infoModal.style.display = "block";
}

function addExportButton() {
  const container = document.querySelector(".nav-buttons");
  const exportBtn = document.createElement("button");
  exportBtn.id = "export-button";
  exportBtn.innerHTML = '<i class="fas fa-download"></i> Export';
  exportBtn.style.backgroundColor = "#4CD964";
  exportBtn.addEventListener("click", () => {
    if (activeChart) {
      const canvas = document.getElementById("chartCanvas");
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${selectedParameter}-${viewType}-data.png`;
      link.href = image;
      link.click();
    }
  });
  container.appendChild(exportBtn);
}

function addComparisonButton() {
  const container = document.querySelector(".nav-buttons");
  const compareBtn = document.createElement("button");
  compareBtn.id = "compare-button";
  compareBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Dual View';
  compareBtn.style.backgroundColor = "#FF9500";
  compareBtn.addEventListener("click", () => {
    let comparisonModal = document.getElementById("comparisonModal");
    if (!comparisonModal) {
      comparisonModal = document.createElement("div");
      comparisonModal.id = "comparisonModal";
      comparisonModal.style.display = "none";
      comparisonModal.style.position = "fixed";
      comparisonModal.style.top = "0";
      comparisonModal.style.left = "0";
      comparisonModal.style.width = "100%";
      comparisonModal.style.height = "100%";
      comparisonModal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      comparisonModal.style.zIndex = "1001";

      const modalContent = document.createElement("div");
      modalContent.className = "modal-content";
      modalContent.style.backgroundColor = "white";
      modalContent.style.margin = "10% auto";
      modalContent.style.padding = "30px";
      modalContent.style.width = "80%";
      modalContent.style.maxWidth = "600px";
      modalContent.style.borderRadius = "10px";
      modalContent.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
      modalContent.style.color = "#333";
      modalContent.innerHTML = `
        <button style="position: absolute; top: 10px; right: 10px; border: none; background: none; font-size: 24px; cursor: pointer;">&times;</button>
        <h2 style="color: #007bff; margin-top: 0;">View Parameters</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
          <select id="compare-param1" style="flex: 1; min-width: 120px;">
            ${Object.keys(dashboardParameters)
              .map((param) => `<option value="${param}">${param}</option>`)
              .join("")}
          </select>
          <select id="compare-param2" style="flex: 1; min-width: 120px;">
            ${Object.keys(dashboardParameters)
              .map((param) => `<option value="${param}">${param}</option>`)
              .join("")}
          </select>
          <button id="run-comparison" style="flex: 1; background-color: #007bff; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">View</button>
        </div>
        <div id="comparison-chart-container" style="height: 300px;"></div>
        <div id="comparison-info" style="margin-top: 20px;"></div>
      `;

      comparisonModal.appendChild(modalContent);
      document.body.appendChild(comparisonModal);

      comparisonModal.onclick = function (event) {
        if (event.target === comparisonModal)
          comparisonModal.style.display = "none";
      };

      const closeBtn = modalContent.querySelector("button");
      closeBtn.onclick = function () {
        comparisonModal.style.display = "none";
      };

      const runComparisonBtn = document.getElementById("run-comparison");
      runComparisonBtn.addEventListener("click", () => {
        const param1 = document.getElementById("compare-param1").value;
        const param2 = document.getElementById("compare-param2").value;

        if (param1 === param2) {
          alert("Please select different parameters to view");
          return;
        }

        const chartContainer = document.getElementById(
          "comparison-chart-container"
        );
        chartContainer.innerHTML = '<canvas id="comparisonCanvas"></canvas>';

        const ctx = document
          .getElementById("comparisonCanvas")
          .getContext("2d");
        const param1Data = dashboardParameters[param1].weeklyData;
        const param2Data = dashboardParameters[param2].weeklyData;
        const days = param1Data.map((item) => item.day);
        const param1Values = param1Data.map((item) => item.value);
        const param2Values = param2Data.map((item) => item.value);

        new Chart(ctx, {
          type: "line",
          data: {
            labels: days,
            datasets: [
              {
                label: param1,
                data: param1Values,
                borderColor: "#2196F3",
                backgroundColor: "rgba(33, 150, 243, 0.1)",
                borderWidth: 2,
                yAxisID: "y1",
                tension: 0.4,
              },
              {
                label: param2,
                data: param2Values,
                borderColor: "#FF5722",
                backgroundColor: "rgba(255, 87, 34, 0.1)",
                borderWidth: 2,
                yAxisID: "y2",
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y1: {
                type: "linear",
                display: true,
                position: "left",
                grid: {
                  drawOnChartArea: false,
                },
                title: {
                  display: true,
                  text:
                    param1 +
                    (dashboardParameters[param1].unit
                      ? ` (${dashboardParameters[param1].unit})`
                      : ""),
                },
                ticks: {
                  color: "#2196F3",
                },
              },
              y2: {
                type: "linear",
                display: true,
                position: "right",
                grid: {
                  drawOnChartArea: false,
                },
                title: {
                  display: true,
                  text:
                    param2 +
                    (dashboardParameters[param2].unit
                      ? ` (${dashboardParameters[param2].unit})`
                      : ""),
                },
                ticks: {
                  color: "#FF5722",
                },
              },
            },
            plugins: {
              tooltip: {
                mode: "index",
                intersect: false,
              },
              title: {
                display: true,
                text: `View: ${param1} vs ${param2}`,
              },
            },
            interaction: {
              mode: "nearest",
              axis: "x",
              intersect: false,
            },
          },
        });

        const infoContainer = document.getElementById("comparison-info");
        infoContainer.innerHTML = `
          <h3>Parameter Information</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 20px;">
            <div style="flex: 1; min-width: 200px;">
              <h4 style="color: #2196F3;">${param1} ${
          dashboardParameters[param1].unit
            ? `(${dashboardParameters[param1].unit})`
            : ""
        }</h4>
              <p><strong>Ideal Range:</strong> ${
                dashboardParameters[param1].min
              } - ${dashboardParameters[param1].max}</p>
              <p>${dashboardParameters[param1].description}</p>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <h4 style="color: #FF5722;">${param2} ${
          dashboardParameters[param2].unit
            ? `(${dashboardParameters[param2].unit})`
            : ""
        }</h4>
              <p><strong>Ideal Range:</strong> ${
                dashboardParameters[param2].min
              } - ${dashboardParameters[param2].max}</p>
              <p>${dashboardParameters[param2].description}</p>
            </div>
          </div>
          <div style="margin-top: 15px;">
            <h4>Correlation Analysis</h4>
            <p>These parameters are displayed for the same tank, showing data from the same time period.</p>
          </div>
        `;
      });
    }
    comparisonModal.style.display = "block";
  });
  container.appendChild(compareBtn);
}

function addStatsButton() {
  const container = document.querySelector(".nav-buttons");
  const statsBtn = document.createElement("button");
  statsBtn.id = "stats-button";
  statsBtn.innerHTML = '<i class="fas fa-chart-pie"></i> Statistics';
  statsBtn.style.backgroundColor = "#5856D6";
  statsBtn.addEventListener("click", () => {
    const data = getCurrentData();
    const values = data.map((item) => item.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sorted = [...values].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const variance =
      values.reduce((a, b) => a + Math.pow(b - average, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    let statsModal = document.getElementById("statsModal");
    if (!statsModal) {
      statsModal = document.createElement("div");
      statsModal.id = "statsModal";
      statsModal.style.display = "none";
      statsModal.style.position = "fixed";
      statsModal.style.top = "0";
      statsModal.style.left = "0";
      statsModal.style.width = "100%";
      statsModal.style.height = "100%";
      statsModal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      statsModal.style.zIndex = "1001";
      const modalContent = document.createElement("div");
      modalContent.className = "modal-content";
      modalContent.style.backgroundColor = "white";
      modalContent.style.margin = "15% auto";
      modalContent.style.padding = "30px";
      modalContent.style.width = "80%";
      modalContent.style.maxWidth = "500px";
      modalContent.style.borderRadius = "10px";
      modalContent.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
      modalContent.style.color = "#333";
      statsModal.appendChild(modalContent);
      document.body.appendChild(statsModal);
      statsModal.onclick = function (event) {
        if (event.target === statsModal) statsModal.style.display = "none";
      };
    }
    const modalContent = statsModal.querySelector(".modal-content");
    const param = dashboardParameters[selectedParameter];
    modalContent.innerHTML = `
            <button style="position: absolute; top: 10px; right: 10px; border: none; background: none; font-size: 24px; cursor: pointer;">&times;</button>
            <h2 style="color: #007bff; margin-top: 0;">${selectedParameter} Statistics</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Average:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${average.toFixed(
                  2
                )} ${param.unit}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Median:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${median.toFixed(
                  2
                )} ${param.unit}</td>
              </tr>
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Minimum:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${min.toFixed(
                  2
                )} ${param.unit}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Maximum:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${max.toFixed(
                  2
                )} ${param.unit}</td>
              </tr>
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Standard Deviation:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${stdDev.toFixed(
                  2
                )} ${param.unit}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold;">Ideal Range:</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${
                  param.min
                } - ${param.max} ${param.unit}</td>
              </tr>
            </table>
            <div style="margin-top: 15px;">
              <div style="height: 20px; background-color: #f0f0f0; border-radius: 5px; overflow: hidden; margin-bottom: 10px;">
                <div style="height: 100%; width: ${
                  ((average - param.min) / (param.max - param.min)) * 100
                }%; background-color: #007bff; border-radius: 5px;"></div>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <small>Min: ${param.min}${param.unit}</small>
                <small>Average: ${average.toFixed(2)}${param.unit}</small>
                <small>Max: ${param.max}${param.unit}</small>
              </div>
            </div>
          `;
    const closeBtn = modalContent.querySelector("button");
    closeBtn.onclick = function () {
      statsModal.style.display = "none";
    };
    statsModal.style.display = "block";
  });
  container.appendChild(statsBtn);
}

addExportButton();
addComparisonButton();
addStatsButton();
