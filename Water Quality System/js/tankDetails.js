import {PARAMETER_CONFIG} from "../tanksData/parameterConfig.js";
import {dashboardParameters} from "../tanksData/dashboardParameters.js";
import {getParameterStatus} from "./main.js";

document.addEventListener("DOMContentLoaded", function () {
    const viewTankButton = document.getElementById("viewTankButton");
    if (window.currentTankId) {
        showTankDetail(window.currentTankId)
    } else {
        showTankDetail(1);
    }


    viewTankButton?.addEventListener("click", function () {
        const tankIdInput = document.getElementById("tankIdInput");
        const tankId = parseInt(tankIdInput.value, 10);
        if (isNaN(tankId)) {
            alert("Please enter a valid Tank ID.");
            return;
        }

        showTankDetail(tankId);
    });


    if (window.location.hash === "#tankDetail") {
        const tankId = localStorage.getItem("selectedTankId");
        if (tankId) showTankDetail(parseInt(tankId, 10));
    }
});

// Load tanks from localStorage
function loadTanks() {
    const storedTanks = localStorage.getItem("tanks");
    if (storedTanks) {
        return JSON.parse(storedTanks);
    }

    return null;
}

function getStatusText(status) {
    switch (status) {
        case "green":
            return "Accepted";
        case "yellow":
            return "Warning";
        case "red":
            return "Dangerous";
        default:
            return "Unknown";
    }
}

export function showTankDetail(tankId) {
    //Get the id from the url is available ?id=
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get("id");
    if (idFromUrl) {
        tankId = parseInt(idFromUrl, 10);
    }

    const tanks = loadTanks();
    const tank = tanks.find((d) => d.id === tankId);

    if (!tank) {
        alert(`Tank with ID ${tankId} not found.`);
        return;
    }
    document.getElementById("tankDetailTitle").textContent = tank.name;

    const locationElement = document.getElementById("tankDetailLocation");
    if (locationElement) {
        locationElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${tank.location}`;
    } else {
        const titleElement = document.getElementById("tankDetailTitle");
        const locationDiv = document.createElement("div");
        locationDiv.id = "tankDetailLocation";
        locationDiv.className = "detail-location";
        locationDiv.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${tank.location}`;
        titleElement.parentNode.insertBefore(locationDiv, titleElement.nextSibling);
    }

    const tankSelection = document.getElementById("tankSelection");
    if (tankSelection) {
        tankSelection.value = tankId;
    }

    document.getElementById("tankDetailTitle").textContent = tank.name;

    const summaryContainer = document.createElement("div");
    summaryContainer.id = "parameterSummary";
    summaryContainer.className = "parameter-summary-container";

    const parameterContainer = document.getElementById("tankParameters");
    parameterContainer.innerHTML = "";

    parameterContainer.appendChild(summaryContainer);

    const lastUpdateElement = document.getElementById("lastUpdate");
    lastUpdateElement.innerHTML = `<i class="far fa-clock"></i> ${new Date(tank.lastUpdate).toLocaleString()}`;
    lastUpdateElement.className = "last-update-time";

    const parameterIcons = {
        ph: "fa-flask", do: "fa-water", tds: "fa-tint", turb: "fa-eye-dropper", temp: "fa-thermometer-half",
    };

    const parameterMapping = {
        ph: "PH", do: "DO", tds: "TDS", turb: "TURB", temp: "TEMP",
    };

    const parameterRanges = {
        ph: {min: 6.0, max: 14.0},
        do: {min: 4.0, max: 14.0},
        tds: {min: 200.0, max: 1205.0},
        temp: {min: 8.0, max: 25.0},
        turb: {min: 0.0, max: 10.0},
    };

    let statusCounts = {
        green: 0, yellow: 0, red: 0,
    };

    Object.entries(PARAMETER_CONFIG).forEach(([param, config]) => {
        const value = tank[param];
        const status = getParameterStatus(param, value);

        statusCounts[status]++;

        const dashboardParamKey = parameterMapping[param];
        const dashboardData = dashboardParameters[dashboardParamKey];

        if (!dashboardData) return;
        const chartData = dashboardData.hourlyData || [];
        const fullHourlyData = generateCompleteHourlyData(chartData);

        const card = document.createElement("div");
        card.className = "parameter-chart-card";
        card.setAttribute("data-param", param);

        const statusText = getStatusText(status);
        const statusColor = status === "green" ? "#22c55e" : status === "yellow" ? "#eab308" : "#ef4444";
        const statusClass = status === "green" ? "status-good" : status === "yellow" ? "status-warning" : "status-alert";

        const lastTwoPoints = fullHourlyData.slice(-2);
        const trendDirection = lastTwoPoints.length === 2 && lastTwoPoints[1].value > lastTwoPoints[0].value ? "up" : "down";

        card.innerHTML = `
      <div class="chart-card-header">
        <div class="chart-card-title">
          <div class="parameter-icon" style="background-color: ${statusColor}">
            <i class="fas ${parameterIcons[param] || config.icon}"></i>
          </div>
          <div class="parameter-info">
            <div class="parameter-name">${config.name}</div>
            <div class="parameter-value">
              <span class="value-number">${value.toFixed(1)}${config.unit}</span>
              <span class="trend-arrow ${trendDirection}">
                <i class="fas fa-caret-${trendDirection}"></i>
              </span>
            </div>
          </div>
        </div>
        <div class="parameter-status ${statusClass}">${statusText}</div>
      </div>
      <div class="chart-container" id="chart-${param}">
        <div class="chart-loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading data...</div>
        </div>
      </div>
      <div class="chart-tooltip" id="tooltip-${param}"></div>
    `;

        parameterContainer.appendChild(card);
        card.addEventListener("click", function () {
            showParameterDetail(param, tankId);
        });
        setTimeout(() => {
            renderLineChart(param, fullHourlyData, statusColor, parameterRanges[param]);
        }, 400 + Math.random() * 300);
    });

    setTimeout(() => {
        createParameterSummaryDoughnut(statusCounts);
    }, 300);
}

function generateCompleteHourlyData(existingData) {
    const hours = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, "0")}:00`);
    const hourMap = new Map();
    existingData.forEach((item) => {
        hourMap.set(item.hour, item.value);
    });

    return hours.map((hour) => {
        const value = hourMap.has(hour) ? hourMap.get(hour) : interpolateValue(hour, hourMap);

        return {hour, value};
    });
}

function createParameterSummaryDoughnut(statusCounts) {
    const summaryContainer = document.getElementById("parameterSummary");
    if (!summaryContainer) return;

    const total = statusCounts.green + statusCounts.yellow + statusCounts.red;
    const percentages = {
        green: Math.round((statusCounts.green / total) * 100) || 0,
        yellow: Math.round((statusCounts.yellow / total) * 100) || 0,
        red: Math.round((statusCounts.red / total) * 100) || 0,
    };

    let overallStatus = "green";
    if (percentages.red > 0) overallStatus = "red"; else if (percentages.yellow > 0) overallStatus = "yellow";

    summaryContainer.innerHTML = `
    <div class="summary-header">
      <h3>Parameter Health Summary</h3>
    </div>
    <div class="summary-content">
      <div class="doughnut-container">
        <svg id="status-doughnut" width="180" height="180" viewBox="0 0 180 180">
          <!-- Will be populated with SVG elements -->
        </svg>
        <div class="doughnut-center">
          <div class="doughnut-percentage ${overallStatus}-text">${getHighestPercentage(percentages)}%</div>
          <div class="doughnut-status">${getStatusText(overallStatus)}</div>
        </div>
      </div>
      <div class="status-legend">
        <div class="legend-item">
          <div class="legend-color" style="background-color: #22c55e;"></div>
          <div class="legend-label">Good</div>
          <div class="legend-value">${percentages.green}%</div>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #eab308;"></div>
          <div class="legend-label">Warning</div>
          <div class="legend-value">${percentages.yellow}%</div>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background-color: #ef4444;"></div>
          <div class="legend-label">Alert</div>
          <div class="legend-value">${percentages.red}%</div>
        </div>
      </div>
    </div>
  `;

    renderDoughnutChart(statusCounts);
}

function showParameterDetail(paramId, id) {
    console.log("Showing parameter detail for:", paramId);

    const tanks = loadTanks();
    const tank = tanks.find((d) => d.id === id);
    if (tank) {
        const rawValue = tank[paramId];
        const displayValue = parseFloat(rawValue.toFixed(1));

        const displayName = getDisplayNameForParam(paramId);

        localStorage.setItem("selectedParameter", displayName);
        localStorage.setItem("selectedParameterDisplayName", displayName);
        localStorage.setItem("selectedTankId", id);
        localStorage.setItem("currentParameterValue", rawValue);
        localStorage.setItem("currentParameterDisplayValue", `${displayValue}`);
        localStorage.setItem("selectedTankName", tank.name);

        if (dashboardParameters[displayName]) {
            dashboardParameters[displayName].currentValue = rawValue;
            console.log(`Updated dashboard parameter ${displayName} with value ${rawValue}`);
        } else {
            console.error(`Dashboard parameter ${displayName} not found`);
        }

        window.location.href = `dashboard.html?id=${paramId}`;
    }
}

function renderLineChart(paramId, data, colorTheme, valueRange) {
    const chartContainer = document.getElementById(`chart-${paramId}`);
    if (!chartContainer) return;

    chartContainer.querySelector(".chart-loading")?.remove();
    const containerWidth = chartContainer.clientWidth || 300;
    const containerHeight = 220;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${containerWidth} ${containerHeight}`);
    svg.classList.add("chart-svg");

    const margin = {
        top: 15, right: 25, bottom: 40, left: 45,
    };

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const chartGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    chartGroup.setAttribute("transform", `translate(${margin.left}, ${margin.top})`);

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    gradient.setAttribute("id", `chart-gradient-${paramId}`);
    gradient.setAttribute("x1", "0%");
    gradient.setAttribute("y1", "0%");
    gradient.setAttribute("x2", "0%");
    gradient.setAttribute("y2", "100%");

    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", colorTheme);
    stop1.setAttribute("stop-opacity", "0.7");

    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", colorTheme);
    stop2.setAttribute("stop-opacity", "0.1");

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const minValue = valueRange ? valueRange.min : Math.min(...data.map((d) => d.value)) * 0.95;
    const maxValue = valueRange ? valueRange.max : Math.max(...data.map((d) => d.value)) * 1.05;

    const xStep = width / (data.length - 1);

    const gridLinesY = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = height - height * ratio;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", '0');
        line.setAttribute("y1", `${y}`);
        line.setAttribute("x2", `${width}`);
        line.setAttribute("y2", `${y}`);
        line.setAttribute("stroke", "#2c3e50");
        line.setAttribute("stroke-width", "0.5");
        line.setAttribute("stroke-dasharray", "3,3");
        line.classList.add("grid-line");
        return line;
    });

    gridLinesY.forEach((line) => chartGroup.appendChild(line));

    const points = [];
    const dataPoints = [];

    data.forEach((d, i) => {
        const x = i * xStep;
        const normalizedY = (d.value - minValue) / (maxValue - minValue);
        const y = height - normalizedY * height;

        points.push(`${x},${y}`);
        dataPoints.push({x, y, value: d.value, hour: d.hour});
    });

    const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    areaPath.setAttribute("d", `M0,${height} L${points.join(" L")} L${width},${height} Z`);
    areaPath.setAttribute("fill", `url(#chart-gradient-${paramId})`);
    areaPath.setAttribute("opacity", "0.8");
    areaPath.classList.add("chart-area");
    const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    linePath.setAttribute("d", `M${points.join(" L")}`);
    linePath.setAttribute("fill", "none");
    linePath.setAttribute("stroke", colorTheme);
    linePath.setAttribute("stroke-width", "3");
    linePath.setAttribute("stroke-linecap", "round");
    linePath.setAttribute("stroke-linejoin", "round");
    linePath.classList.add("chart-line");

    areaPath.classList.add("animate-in");
    linePath.classList.add("animate-in");

    chartGroup.appendChild(areaPath);
    chartGroup.appendChild(linePath);

    const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "g");
    xAxis.setAttribute("transform", `translate(0, ${height})`);
    xAxis.classList.add("x-axis");

    const xAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
    xAxisTitle.textContent = "Time (hours)";
    xAxisTitle.setAttribute("x", `${width / 2}`);
    xAxisTitle.setAttribute("y", '35');
    xAxisTitle.setAttribute("text-anchor", "middle");
    xAxisTitle.setAttribute("font-size", "12px");
    xAxisTitle.setAttribute("font-weight", "bold");
    xAxisTitle.setAttribute("fill", "#94a3b8");
    xAxis.appendChild(xAxisTitle);

    const tickIndices = [];
    for (let i = 0; i < data.length; i += 3) {
        tickIndices.push(i);
    }
    if (!tickIndices.includes(data.length - 1)) {
        tickIndices.push(data.length - 1);
    }

    tickIndices.forEach((i) => {
        const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
        tick.setAttribute("x1", `${i * xStep}`);
        tick.setAttribute("y1", '0');
        tick.setAttribute("x2", `${i * xStep}`);
        tick.setAttribute("y2", '5');
        tick.setAttribute("stroke", "#94a3b8");
        tick.setAttribute("stroke-width", "1");

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.textContent = data[i].hour;
        label.setAttribute("x", `${i * xStep}`);
        label.setAttribute("y", '20');
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("font-size", "11px");
        label.setAttribute("fill", "#94a3b8");

        xAxis.appendChild(tick);
        xAxis.appendChild(label);
    });

    const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "g");
    yAxis.classList.add("y-axis");

    const yAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yAxisTitle.textContent = PARAMETER_CONFIG[paramId].name;
    yAxisTitle.setAttribute("transform", "rotate(-90)");
    yAxisTitle.setAttribute("x", `${-height / 2}`);
    yAxisTitle.setAttribute("y", `-30`);
    yAxisTitle.setAttribute("text-anchor", "middle");
    yAxisTitle.setAttribute("font-size", "12px");
    yAxisTitle.setAttribute("font-weight", "bold");
    yAxisTitle.setAttribute("fill", "#94a3b8");
    yAxis.appendChild(yAxisTitle);

    const yLabelCount = 5;
    const yLabelValues = [];

    for (let i = 0; i < yLabelCount; i++) {
        const ratio = i / (yLabelCount - 1);
        const value = minValue + ratio * (maxValue - minValue);
        yLabelValues.push(value);
    }

    yLabelValues.forEach((value) => {
        const normalizedY = (value - minValue) / (maxValue - minValue);
        const y = height - normalizedY * height;

        const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
        tick.setAttribute("x1", '-5');
        tick.setAttribute("y1", `${y}`);
        tick.setAttribute("x2", '0');
        tick.setAttribute("y2", `${y}`);
        tick.setAttribute("stroke", "#94a3b8");
        tick.setAttribute("stroke-width", "1");

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.textContent = value.toFixed(1);
        label.setAttribute("x", '-10');
        label.setAttribute("y", `${y + 4}`);
        label.setAttribute("text-anchor", "end");
        label.setAttribute("font-size", "11px");
        label.setAttribute("fill", "#94a3b8");

        yAxis.appendChild(tick);
        yAxis.appendChild(label);
    });

    dataPoints.forEach((point, idx) => {
        if (idx < dataPoints.length - 1) {
            const nextPoint = dataPoints[idx + 1];
            const connector = document.createElementNS("http://www.w3.org/2000/svg", "line");
            connector.setAttribute("x1", point.x);
            connector.setAttribute("y1", point.y);
            connector.setAttribute("x2", nextPoint.x);
            connector.setAttribute("y2", nextPoint.y);
            connector.setAttribute("stroke", colorTheme);
            connector.setAttribute("stroke-width", "2.5");
            connector.setAttribute("stroke-linecap", "round");
            connector.classList.add("connector-line");

            connector.style.opacity = "0";
            setTimeout(() => {
                connector.style.opacity = "1";
                connector.style.transition = "opacity 0.3s ease-in-out";
            }, 300 + idx * 20);

            chartGroup.appendChild(connector);
        }
    });

    dataPoints.forEach((point, idx) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", point.x);
        circle.setAttribute("cy", point.y);
        circle.setAttribute("r", "4");
        circle.setAttribute("fill", "white");
        circle.setAttribute("stroke", colorTheme);
        circle.setAttribute("stroke-width", "2");
        circle.setAttribute("data-value", point.value.toFixed(1));
        circle.setAttribute("data-hour", point.hour);
        circle.setAttribute("data-index", `${idx}`);
        circle.classList.add("data-point");

        circle.addEventListener("mouseover", function (e) {
            showTooltip(paramId, e, point);
            this.setAttribute("r", "6");
            this.setAttribute("stroke-width", "2.5");
        });

        circle.addEventListener("mouseout", function () {
            hideTooltip(paramId);
            this.setAttribute("r", "4");
            this.setAttribute("stroke-width", "2");
        });

        circle.style.opacity = "0";
        setTimeout(() => {
            circle.style.opacity = "1";
            circle.style.transition = "opacity 0.4s ease-in-out";
        }, 500 + idx * 25);

        chartGroup.appendChild(circle);
    });

    chartGroup.appendChild(xAxis);
    chartGroup.appendChild(yAxis);

    svg.appendChild(chartGroup);
    chartContainer.appendChild(svg);
}

function interpolateValue(hour, hourMap) {
    const currentHour = parseInt(hour.split(":")[0]);

    let prevHour = null;
    let nextHour = null;
    let prevValue = null;
    let nextValue = null;

    for (let i = currentHour - 1; i >= 0; i--) {
        const h = `${i.toString().padStart(2, "0")}:00`;
        if (hourMap.has(h)) {
            prevHour = i;
            prevValue = hourMap.get(h);
            break;
        }
    }

    for (let i = currentHour + 1; i < 24; i++) {
        const h = `${i.toString().padStart(2, "0")}:00`;
        if (hourMap.has(h)) {
            nextHour = i;
            nextValue = hourMap.get(h);
            break;
        }
    }

    if (prevValue !== null && nextValue !== null) {
        const ratio = (currentHour - prevHour) / (nextHour - prevHour);
        return prevValue + ratio * (nextValue - prevValue);
    }

    if (prevValue !== null) return prevValue;
    if (nextValue !== null) return nextValue;
    return 0;
}

function getHighestPercentage(percentages) {
    if (percentages.red > 0) return percentages.red;
    if (percentages.yellow > 0) return percentages.yellow;
    return percentages.green;
}

function renderDoughnutChart(statusCounts) {
    const svg = document.getElementById("status-doughnut");
    if (!svg) return;

    const centerX = 90;
    const centerY = 90;
    const radius = 70;
    const thickness = 25;

    const total = statusCounts.green + statusCounts.yellow + statusCounts.red;

    let startAngle = 0;
    const segments = [{value: statusCounts.green, color: "#22c55e"}, {
        value: statusCounts.yellow,
        color: "#eab308"
    }, {value: statusCounts.red, color: "#ef4444"},].filter((segment) => segment.value > 0);

    if (segments.length === 0) {
        segments.push({value: 1, color: "#22c55e"});
    }

    segments.forEach((segment, index) => {
        const percentage = segment.value / total;
        const angle = percentage * 2 * Math.PI;
        const endAngle = startAngle + angle;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

        const largeArcFlag = angle > Math.PI ? 1 : 0;

        const outerArc = `M ${centerX + radius * Math.cos(startAngle)} ${centerY + radius * Math.sin(startAngle)} 
                      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${centerX + radius * Math.cos(endAngle)} ${centerY + radius * Math.sin(endAngle)}`;

        const innerRadius = radius - thickness;
        const innerArc = `L ${centerX + innerRadius * Math.cos(endAngle)} ${centerY + innerRadius * Math.sin(endAngle)} 
                      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${centerX + innerRadius * Math.cos(startAngle)} ${centerY + innerRadius * Math.sin(startAngle)} Z`;

        path.setAttribute("d", outerArc + innerArc);
        path.setAttribute("fill", segment.color);
        path.setAttribute("stroke", "white");
        path.setAttribute("stroke-width", "1");
        path.classList.add("doughnut-segment");
        path.style.opacity = "0";

        setTimeout(() => {
            path.style.opacity = "1";
            path.style.transition = "opacity 0.5s ease-in-out";
        }, 100 * index);

        svg.appendChild(path);

        startAngle = endAngle;
    });
}

export function getDisplayNameForParam(paramId) {
    const mapping = {
        ph: "PH", turb: "TURB", temp: "TEMP", do: "DO", tds: "TDS",
    };
    return mapping[paramId] || paramId.toUpperCase();
}


function hideTooltip(paramId) {
    const tooltip = document.getElementById(`tooltip-${paramId}`);
    if (tooltip) {
        tooltip.style.opacity = "0";
        setTimeout(() => {
            tooltip.style.display = "none";
        }, 300);
    }
}

function showTooltip(paramId, event, dataPoint) {
    const tooltip = document.getElementById(`tooltip-${paramId}`);
    if (!tooltip) return;

    const param = PARAMETER_CONFIG[paramId];
    const unit = param ? param.unit : "";

    tooltip.innerHTML = `
        <div class="tooltip-time">${dataPoint.hour}</div>
        <div class="tooltip-value">${dataPoint.value.toFixed(1)}${unit}</div>
    `;

    const circle = event.target;
    const cx = parseFloat(circle.getAttribute("cx"));
    const cy = parseFloat(circle.getAttribute("cy"));

    // Get the SVG and container elements
    const svg = circle.ownerSVGElement;
    const chartContainer = svg.closest('.chart-container');
    const containerRect = chartContainer.getBoundingClientRect();

    // Convert SVG coordinates to screen coordinates
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = cx;
    svgPoint.y = cy;
    const screenPoint = svgPoint.matrixTransform(svg.getScreenCTM());

    // Calculate tooltip position relative to the chart container
    const tooltipX = screenPoint.x - containerRect.left + 60;
    const tooltipY = screenPoint.y - containerRect.top + 30;

    // Position the tooltip and make it visible
    tooltip.style.display = "block";
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
    tooltip.style.opacity = "1";
}