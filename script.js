const ESP32_URL = "http://172.20.10.2/data";

const ppmTexto = document.getElementById("ppm");
const estadoTexto = document.getElementById("estado");
const adcTexto = document.getElementById("adc");
const mvTexto = document.getElementById("mv");
const escalaTexto = document.getElementById("escala");
const ipTexto = document.getElementById("ip");
const relleno = document.getElementById("relleno");

const labels = [];
const datosPPM = [];

const ctx = document.getElementById("graficoPPM").getContext("2d");

const grafico = new Chart(ctx, {
  type: "line",
  data: {
    labels: labels,
    datasets: [{
      label: "PPM estimado",
      data: datosPPM,
      borderWidth: 2,
      tension: 0.3,
      fill: false
    }]
  },
  options: {
    responsive: true,
    animation: false,
    scales: {
      y: {
        min: 200,
        max: 10000
      }
    }
  }
});

async function actualizarDatos() {
  try {
    const respuesta = await fetch(ESP32_URL);
    const data = await respuesta.json();

    ppmTexto.textContent = `${data.ppm} ppm`;
    estadoTexto.textContent = `Nivel: ${data.estado}`;
    adcTexto.textContent = `ADC crudo: ${data.adc}`;
    mvTexto.textContent = `Voltaje: ${data.mv} mV`;
    escalaTexto.textContent = `Escala ADC: ${data.escala} %`;
    ipTexto.textContent = `IP del ESP32: ${data.ip}`;
    relleno.style.width = `${data.escala}%`;

    const hora = new Date().toLocaleTimeString();
    labels.push(hora);
    datosPPM.push(data.ppm);

    if (labels.length > 20) {
      labels.shift();
      datosPPM.shift();
    }

    grafico.update();
  } catch (error) {
    ppmTexto.textContent = "Sin conexión";
    estadoTexto.textContent = "No se pudo leer el ESP32";
    console.error(error);
  }
}

setInterval(actualizarDatos, 2000);
actualizarDatos();
