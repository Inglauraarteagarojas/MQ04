const FIREBASE_ACTUAL_URL = "https://esp32mq04-default-rtdb.firebaseio.com/historial.json";

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
        max: 10000,
        title: {
          display: true,
          text: "PPM"
        }
      },
      x: {
        title: {
          display: true,
          text: "Muestras"
        }
      }
    }
  }
});

function ordenarRegistros(data) {
  if (!data || typeof data !== "object") return [];
  return Object.entries(data).map(([id, valor]) => ({
    id,
    ...valor
  })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

async function actualizarDatos() {
  try {
    const respuesta = await fetch(FIREBASE_ACTUAL_URL, { cache: "no-store" });
    const data = await respuesta.json();

    const registros = ordenarRegistros(data);

    if (!registros.length) {
      ppmTexto.textContent = "Sin datos";
      estadoTexto.textContent = "Firebase vacío";
      adcTexto.textContent = "ADC crudo: --";
      mvTexto.textContent = "Voltaje: -- mV";
      escalaTexto.textContent = "Escala ADC: -- %";
      ipTexto.textContent = "IP del ESP32: --";
      relleno.style.width = "0%";
      return;
    }

    const ultimo = registros[registros.length - 1];

    ppmTexto.textContent = `${ultimo.ppm} ppm`;
    estadoTexto.textContent = `Nivel: ${ultimo.estado}`;
    adcTexto.textContent = `ADC crudo: ${ultimo.adc}`;
    mvTexto.textContent = `Voltaje: ${ultimo.mv} mV`;
    escalaTexto.textContent = `Escala ADC: ${ultimo.escala} %`;
    ipTexto.textContent = `IP del ESP32: ${ultimo.ip}`;
    relleno.style.width = `${ultimo.escala}%`;

    labels.length = 0;
    datosPPM.length = 0;

    const ultimos20 = registros.slice(-20);
    ultimos20.forEach((item, index) => {
      labels.push(`M${index + 1}`);
      datosPPM.push(item.ppm);
    });

    grafico.update();
  } catch (error) {
    ppmTexto.textContent = "Sin conexión";
    estadoTexto.textContent = "No se pudo leer Firebase";
    console.error("Error leyendo Firebase:", error);
  }
}

function convertirA_CSV(registros) {
  const encabezados = ["id", "adc", "mv", "escala", "ppm", "estado", "ip", "timestamp"];
  let csv = encabezados.join(",") + "\n";

  registros.forEach(registro => {
    const fila = encabezados.map(campo => {
      const valor = registro[campo] ?? "";
      return `"${String(valor).replace(/"/g, '""')}"`;
    });
    csv += fila.join(",") + "\n";
  });

  return csv;
}

function descargarTextoComoArchivo(nombreArchivo, contenido) {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const enlace = document.createElement("a");
  const url = window.URL.createObjectURL(blob);

  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}

async function descargarCSVDesdeFirebase() {
  try {
    const respuesta = await fetch(FIREBASE_ACTUAL_URL, { cache: "no-store" });
    const data = await respuesta.json();

    const registros = ordenarRegistros(data);

    if (!registros.length) {
      alert("No hay historial para exportar.");
      return;
    }

    const csv = convertirA_CSV(registros);
    const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    descargarTextoComoArchivo(`historial_mq4_${fecha}.csv`, csv);
  } catch (error) {
    console.error("Error descargando CSV:", error);
    alert("No se pudo descargar el historial CSV.");
  }
}

btnDescargarCSV.addEventListener("click", descargarCSVDesdeFirebase);

setInterval(actualizarDatos, 3000);
actualizarDatos();
