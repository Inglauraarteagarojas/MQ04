
const FIREBASE_HISTORIAL_URL = "https://esp32mq04-default-rtdb.firebaseio.com/historial.json";

const ppmTexto = document.getElementById("ppm");
const estadoTexto = document.getElementById("estado");
const adcTexto = document.getElementById("adc");
const mvTexto = document.getElementById("mv");
const escalaTexto = document.getElementById("escala");
const ipTexto = document.getElementById("ip");
const fechaTexto = document.getElementById("fecha");
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
        ticks: {
          maxRotation: 60,
          minRotation: 60,
          autoSkip: true,
          maxTicksLimit: 8
        },
        title: {
          display: true,
          text: "Fecha y hora"
        }
      }
    }
  }
});

function ordenarRegistros(data) {
  if (!data || typeof data !== "object") return [];
  return Object.entries(data)
    .map(([id, valor]) => ({ id, ...valor }))
    .sort((a, b) => {
      const fa = a.fecha || "";
      const fb = b.fecha || "";
      return fa.localeCompare(fb);
    });
}

async function actualizarDatos() {
  try {
    const respuesta = await fetch(FIREBASE_HISTORIAL_URL, { cache: "no-store" });
    const data = await respuesta.json();
    const registros = ordenarRegistros(data);

    if (!registros.length) {
      ppmTexto.textContent = "Sin datos";
      estadoTexto.textContent = "Firebase vacío";
      adcTexto.textContent = "ADC crudo: --";
      mvTexto.textContent = "Voltaje: -- mV";
      escalaTexto.textContent = "Escala ADC: -- %";
      ipTexto.textContent = "IP del ESP32: --";
      fechaTexto.textContent = "Fecha: --";
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
    fechaTexto.textContent = `Fecha: ${ultimo.fecha || "--"}`;
    relleno.style.width = `${ultimo.escala}%`;

    labels.length = 0;
    datosPPM.length = 0;

    const ultimos20 = registros.slice(-20);
    ultimos20.forEach((item) => {
      labels.push(item.fecha || "Sin fecha");
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
  const encabezados = ["id", "fecha", "adc", "mv", "escala", "ppm", "estado", "ip"];
  const lineas = [encabezados.join(",")];

  registros.forEach(registro => {
    const fila = encabezados.map(campo => {
      const valor = registro[campo] ?? "";
      return `"${String(valor).replace(/"/g, '""')}"`;
    });
    lineas.push(fila.join(","));
  });

  return lineas.join("\n");
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

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function descargarCSVDesdeFirebase() {
  try {
    const respuesta = await fetch(FIREBASE_HISTORIAL_URL, { cache: "no-store" });
    const data = await respuesta.json();
    const registros = ordenarRegistros(data);

    if (!registros.length) {
      alert("No hay historial para exportar.");
      return;
    }

    const csv = convertirA_CSV(registros);
    const fechaArchivo = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    descargarArchivoCSV(`historial_mq4_${fechaArchivo}.csv`, csv);
  } catch (error) {
    console.error("Error descargando CSV:", error);
    alert("No se pudo descargar el historial CSV.");
  }
}

btnDescargarCSV.addEventListener("click", descargarCSVDesdeFirebase);

setInterval(actualizarDatos, 3000);
actualizarDatos();
