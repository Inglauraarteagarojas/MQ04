const FIREBASE_URL = "https://esp32mq04-default-rtdb.firebaseio.com/mq4.json";

const ppmTexto = document.getElementById("ppm");
const estadoTexto = document.getElementById("estado");
const adcTexto = document.getElementById("adc");
const mvTexto = document.getElementById("mv");
const escalaTexto = document.getElementById("escala");
const ipTexto = document.getElementById("ip");
const relleno = document.getElementById("relleno");
const btnDescargarCSV = document.getElementById("btnDescargarCSV");

const labels = [];
const datosPPM = [];

let ultimoDatoFirebase = null;

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
    plugins: {
      legend: {
        display: true
      }
    },
    scales: {
      y: {
        min: 200,
        max: 10000,
        title: {
          display: true,
          text: "PPM"
        }
      },
      x: {
        title: {
          display: true,
          text: "Hora"
        }
      }
    }
  }
});

async function actualizarDatos() {
  try {
    const respuesta = await fetch(FIREBASE_URL);
    const data = await respuesta.json();

    if (!data) {
      ppmTexto.textContent = "Sin datos";
      estadoTexto.textContent = "Firebase vacío";
      adcTexto.textContent = "ADC crudo: --";
      mvTexto.textContent = "Voltaje: -- mV";
      escalaTexto.textContent = "Escala ADC: -- %";
      ipTexto.textContent = "IP del ESP32: --";
      relleno.style.width = "0%";
      return;
    }

    ultimoDatoFirebase = data;

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
    estadoTexto.textContent = "No se pudo leer Firebase";
    adcTexto.textContent = "ADC crudo: --";
    mvTexto.textContent = "Voltaje: -- mV";
    escalaTexto.textContent = "Escala ADC: -- %";
    ipTexto.textContent = "IP del ESP32: --";
    relleno.style.width = "0%";
    console.error("Error leyendo Firebase:", error);
  }
}

function convertirA_CSV(datos) {
  const encabezados = ["adc", "escala", "estado", "ip", "mv", "ppm"];
  const filas = [encabezados.join(",")];

  for (const fila of datos) {
    const valores = encabezados.map(campo => {
      const valor = fila[campo] ?? "";
      return `"${String(valor).replace(/"/g, '""')}"`;
    });
    filas.push(valores.join(","));
  }

  return filas.join("\n");
}

function descargarArchivoCSV(nombreArchivo, contenidoCSV) {
  const blob = new Blob([contenidoCSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  URL.revokeObjectURL(url);
}

async function descargarCSVDesdeFirebase() {
  try {
    const respuesta = await fetch(FIREBASE_URL);
    const data = await respuesta.json();

    if (!data) {
      alert("No hay datos en Firebase para exportar.");
      return;
    }

    let registros = [];

    // Si Firebase devuelve un solo objeto
    if (!Array.isArray(data) && typeof data === "object" && data.adc !== undefined) {
      registros = [data];
    } 
    // Si en el futuro guardas múltiples registros como objetos hijos
    else if (!Array.isArray(data) && typeof data === "object") {
      registros = Object.values(data);
    } 
    // Si alguna vez guardas arreglo
    else if (Array.isArray(data)) {
      registros = data.filter(item => item);
    }

    if (registros.length === 0) {
      alert("No se encontraron registros para exportar.");
      return;
    }

    const csv = convertirA_CSV(registros);
    const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    descargarArchivoCSV(`mq4_datos_${fecha}.csv`, csv);

  } catch (error) {
    console.error("Error exportando CSV:", error);
    alert("No se pudo descargar el CSV.");
  }
}

btnDescargarCSV.addEventListener("click", descargarCSVDesdeFirebase);

setInterval(actualizarDatos, 3000);
actualizarDatos();
