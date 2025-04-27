export const PARAMETER_CONFIG = {
    ph: {
        name: "PH",
        min: 6.5,
        max: 8.5,
        warningMin: 6.0,
        warningMax: 9.0,
        unit: "",
        icon: "fa-flask"
    },
    do: {
        name: "DO",
        min: 5,
        max: 8,
        warningMin: 4,
        warningMax: 9,
        unit: "mg/L",
        icon: "fa-droplet",
    },
    temp: {
        name: "TEMP",
        min: 10,
        max: 18.5,
        warningMin: 8,
        warningMax: 20,
        unit: "°C",
        icon: "fa-temperature-half"
    },
    "tds": {
        name: "TDS",
        min: 300,
        max: 1000,
        warningMin: 200,
        warningMax: 1200,
        unit: "mg/L",
        icon: "fa-chart-simple"
    },
    "turb": {
        name: "TURB",
        min: 0,
        max: 5,
        warningMin: 1,
        warningMax: 5,
        unit: "NTU",
        icon: "fa-water"
    }
}