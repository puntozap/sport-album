# Flujos de usuario — Álbum de Figuritas WC2026

---

## 1. Flujo para llenar el álbum

```mermaid
flowchart TD
    A([🚀 Abres la app]) --> B[Ves la página de un equipo]
    B --> C{¿Tienes sobres disponibles?}

    C -- Sí --> D[Tocas 🎴 Abrir sobre]
    C -- No --> E[Esperas la próxima ventana\nde tiempo para recibir más]
    E --> C

    D --> F[Se abre el PackOpener\nVes 5 cartas boca abajo]
    F --> G[Tocas cada carta\npara revelarla]
    G --> H{¿El cromo ya\nlo tienes?}

    H -- No, es nuevo --> I[Se guarda en tu bandeja\n🎴 Pega tus cromos]
    H -- Sí, es repetido --> J[Se guarda como duplicado\ndisponible para regalar]

    I --> K[Navegas al país\ndel cromo]
    K --> L[Doble tap sobre\nel cromo en la bandeja]
    L --> M[El cromo se pega\nen su espacio del álbum ✅]

    J --> N[Va a Mis repetidas\n🔄]

    M --> O{¿Completaste\nel álbum?}
    O -- No --> B
    O -- Sí --> P([🏆 ¡Álbum completo!])
```

### Pasos clave

| Paso | Acción | Resultado |
|------|--------|-----------|
| 1 | Abrir sobre | 5 cromos aleatorios revelados |
| 2 | Revelar cromo | Se guarda en la bandeja si es nuevo |
| 3 | Ir al país | Navega a la página del equipo |
| 4 | Doble tap en cromo | Se pega en el álbum |
| 5 | Repetir | Hasta completar los 576 cromos |

> **Nota:** Los sobres se recargan automáticamente por ventanas de tiempo. Cuantos más cromos tengas, más raros se vuelven los nuevos.

---

## 2. Flujo para intercambiar / regalar cromos

```mermaid
flowchart TD
    A([👤 Tienes cromos duplicados]) --> B[Menú → 🔄 Mis repetidas]
    B --> C[Buscas el equipo\no deslizas la lista]
    C --> D[Seleccionas los cromos\nque quieres regalar]
    D --> E{¿Tienes número\nde WhatsApp guardado?}

    E -- No --> F[Aparece modal\npara agregar nombre\ny WhatsApp]
    F --> G[Guardas tu número]
    E -- Sí --> G

    G --> H[Tocas Generar QR]
    H --> I[Se crea un código QR\nválido para una sola persona]

    I --> J[📱 Muestras el QR\na tu amigo en físico]

    J --> K{¿Tu amigo\nescanea el QR?}
    K -- No --> L[El QR sigue activo\nhasta que alguien lo use]
    L --> K

    K -- Sí --> M[Se abre el álbum\nen el teléfono de tu amigo]
    M --> N[Tu amigo ve la lista\nde cromos que recibirá]
    N --> O{¿Acepta\nlos cromos?}

    O -- No --> P([❌ Transacción cancelada])
    O -- Sí --> Q[Los cromos van directo\na la bandeja de tu amigo ✅]

    Q --> R[Tu amigo puede pegarlos\nen su álbum al instante]
    Q --> S[📲 Tú recibes notificación\npor WhatsApp y push]
    S --> T{¿Regalaste\n30+ cromos en total?}

    T -- Sí --> U[🎁 ¡Recibes 5 sobres\nde recompensa!]
    T -- No --> V([✅ Intercambio completado])
    U --> V
```

### Pasos clave

| Paso | Quién | Acción |
|------|-------|--------|
| 1 | **Emisor** | Abre "Mis repetidas" y selecciona cromos |
| 2 | **Emisor** | Toca "Generar QR" |
| 3 | **Emisor** | Muestra el QR al receptor (en físico) |
| 4 | **Receptor** | Escanea el QR con la cámara |
| 5 | **Receptor** | Acepta los cromos en la app |
| 6 | **Receptor** | Pega los cromos en su álbum al instante |
| 7 | **Emisor** | Recibe notificación de confirmación |
| 8 | **Emisor** | Si acumula 30+ regalados → 5 sobres de recompensa |

> **Importante:** El QR es de un solo uso. Una vez que el receptor lo acepta, no puede usarse de nuevo.

---

## Resumen visual del ecosistema

```mermaid
graph LR
    subgraph Tu dispositivo
        A[🎴 Álbum] --> B[Sobres]
        B --> C[Cromos nuevos → Pegar]
        B --> D[Duplicados → Regalar]
    end

    subgraph Intercambio QR
        D --> E[Generar QR]
        E -->|Escanea| F[Amigo acepta]
        F --> G[Cromos en su bandeja]
    end

    subgraph Recompensas
        F -->|30 cromos regalados| H[5 sobres gratis 🎁]
        H --> B
    end
```
