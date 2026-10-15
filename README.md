# Blessed Barber Shop — Reserva de turnos

Página estática (HTML + CSS + JS, sin dependencias) para reservar turnos en Blessed Barber Shop, Lavalle 575, CABA.

## Cómo verla
Abrí `index.html` en el navegador o serví la carpeta:

```bash
python3 -m http.server 8000
```

Se puede publicar tal cual en GitHub Pages, Netlify o Vercel.

## Cómo funciona la reserva
1. Servicio → 2. Día → 3. Horario → 4. Nombre y WhatsApp.
2. Al confirmar se genera un código y se abre WhatsApp con el mensaje armado para el número del local. También se puede descargar un `.ics` para agendarlo.

Los turnos se guardan en el `localStorage` del navegador (es una demo sin backend), así que solo bloquean horarios en ese mismo dispositivo. Para turnos compartidos entre todos los clientes hace falta un backend (Google Sheets/Calendar, Firebase, Supabase, etc.).

## Editar servicios, precios y horarios
Todo está en el objeto `CONFIG` al principio de `script.js`.
