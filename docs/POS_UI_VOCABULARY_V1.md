# Plataforma Nook — POS UI Vocabulary v1

**Estado:** VIGENTE  
**Fecha:** 2026-09-30  
**Origen:** DEV-UX-ARCH-01.3A — Integración y normalización visual del POS  
**Ámbito:** superficies internas de Plataforma Nook

---

## 1. Propósito

POS UI Vocabulary v1 define el vocabulario visual base de las superficies internas de Plataforma Nook.

El estándar nace del POS porque corresponde a la superficie operacional CORE y fue validado en uso real sobre el dispositivo principal de operación: notebook de aproximadamente 14 pulgadas.

Su propósito es evitar que cada módulo vuelva a definir independientemente:

- jerarquías tipográficas;
- densidad;
- espaciados;
- superficies;
- controles;
- acciones;
- estados;
- uso del color;
- distribución horizontal/vertical.

Este documento es una referencia normativa para nuevas superficies y para la normalización progresiva de superficies existentes.

No implica que todas las pantallas deban verse idénticas. Superficies especializadas pueden divergir cuando exista una razón funcional o ergonómica explícita.

---

## 2. Principios

### 2.1 Densidad operacional

Plataforma Nook prioriza densidad útil por sobre layouts tipo landing page.

En superficies operacionales:

- maximizar información y acciones visibles sin scroll innecesario;
- evitar padding excesivo;
- evitar tarjetas anidadas sin función;
- evitar filas completas para información o acciones que pueden convivir horizontalmente;
- preservar legibilidad y áreas de interacción adecuadas;
- ganar densidad eliminando redundancia antes que reduciendo tipografía.

No reducir indiscriminadamente el tamaño del texto para ganar espacio.

### 2.2 Horizontalidad

Cuando dos elementos relacionados pueden coexistir horizontalmente sin perjudicar comprensión o interacción, preferir composición horizontal.

Ejemplos aprobados:

- nombre de producto + acciones + precio;
- total + acción Confirmar venta;
- label + control cuando el ancho disponible lo permite;
- contador/estado junto a su encabezado cuando no introduce ruido.

### 2.3 Una sola jerarquía semántica

El aspecto visual debe depender del rol semántico del elemento y no del componente donde aparece.

Un descriptor secundario debe verse igual en Productos, Pedido, Contexto u otra superficie equivalente.

### 2.4 No duplicar información

No mostrar simultáneamente el mismo dato en varias zonas cercanas salvo que exista una necesidad operacional concreta.

Ejemplo cerrado en POS:

- el total de la venta tiene una ubicación principal en el cierre de Pedido;
- no se repite en el encabezado de Pedido ni en Contexto.

### 2.5 La UI no reemplaza autorización

Ocultar navegación o controles no constituye seguridad.

Toda restricción funcional debe continuar protegida server-side mediante el modelo de autorización vigente.

---

## 3. Dispositivo base

Superficies internas estándar:

- dispositivo objetivo principal: notebook ~14";
- shell compacto;
- sidebar colapsado por defecto;
- topbar compacta;
- maximización del área útil de trabajo.

El estándar no debe optimizarse exclusivamente para pantallas grandes de escritorio.

---

## 4. Superficies

### 4.1 Superficie principal

Patrón base:

- fondo blanco;
- borde `neutral-200`;
- `rounded-2xl`;
- `shadow-sm`;
- separación visible respecto del fondo general;
- padding contenido y consistente.

El fondo de workspace puede utilizar un tono neutro/lila muy suave para distinguir las superficies blancas.

### 4.2 Subsección

Patrón base:

- `rounded-lg`;
- borde `neutral-200` cuando requiera delimitación;
- fondo blanco o `neutral-50` según jerarquía;
- evitar sombras internas innecesarias.

### 4.3 Superficies semánticas

Color sólo cuando comunica significado.

Ejemplos:

- verde: éxito, beneficio, regalo o estado positivo;
- rojo: error, acción destructiva o validación inválida;
- ámbar: advertencia o condición que requiere atención;
- violeta Nook: acción primaria, selección o énfasis de producto.

No utilizar colores semánticos únicamente como decoración.

---

## 5. Jerarquía tipográfica

### 5.1 Título de superficie

Ejemplos:

- PRODUCTOS
- PEDIDO
- CONTEXTO

Referencia:

`text-[13px] font-black uppercase tracking-wide text-neutral-600`

### 5.2 Subtítulo / contador

Ejemplos:

- `19 disponibles`
- `3 productos`

Referencia:

`text-[11px] font-normal text-neutral-500`

Puede utilizar `leading-none` o equivalente cuando corresponda a encabezados compactos.

### 5.3 Título de producto o línea operacional

Referencia:

`text-[13px] font-black text-neutral-900`

Debe priorizar legibilidad y truncarse cuando el ancho disponible lo requiera.

### 5.4 Título de subsección

Ejemplos:

- ADICIONALES DEL PEDIDO
- DESCUENTOS

Referencia:

`text-[11px] font-black uppercase tracking-wide text-neutral-600`

### 5.5 Descriptor secundario

Ejemplos:

- `Ítem especial o nota`
- `Sin descuento manual`

Referencia:

`text-[10px] font-normal leading-tight text-neutral-500`

Descriptores equivalentes deben mantener exactamente el mismo tratamiento aunque cambie su contenido o estado.

### 5.6 Label de campo

Ejemplos:

- PAGO
- PLATAFORMA
- NÚMERO EXTERNO
- TOTAL LÍNEA

Referencia:

`text-[10px] font-bold uppercase tracking-wide text-neutral-500`

### 5.7 Valor de campo

Referencia general:

`text-[12px] font-bold text-neutral-900`

### 5.8 Metadata

Referencia:

`text-[10px] text-neutral-500`

Usar para información complementaria que no debe competir con el nombre, precio o acción principal.

### 5.9 Precio de producto/línea

Referencia:

`text-[13px] font-black text-violet-700`

### 5.10 Total principal

Referencia:

`text-[18px] font-black text-neutral-950`

El total principal tiene jerarquía propia y no debe tratarse como descriptor secundario.

---

## 6. Espaciado

Unidad operacional base:

`8px`

Referencias:

- gap principal entre superficies: ~8px;
- padding habitual de superficie: ~12px (`p-3`);
- subsecciones compactas: 8–10px;
- separación interna pequeña: 4–6px;
- evitar acumulación de márgenes verticales.

Los elementos pertenecientes a una misma columna visual deben respetar guías comunes izquierda/derecha.

Ejemplo aprobado en Pedido:

- encabezado;
- líneas de productos;
- adicionales;
- descuentos;
- pago;
- cierre.

---

## 7. Inputs y selects

Referencia general:

- altura: `h-8`;
- texto: `text-[12px]`;
- `rounded-lg`;
- borde `neutral-200`;
- fondo blanco;
- focus violeta consistente.

No mezclar arbitrariamente alturas `h-7`, `h-8`, `h-9` para controles equivalentes.

Excepciones requieren razón funcional explícita.

---

## 8. Botones

### 8.1 Acción primaria

Referencia:

- altura aproximada: 40–44px según contexto;
- `rounded-lg`;
- fondo violeta;
- texto blanco;
- `text-[12px]`;
- `font-black`;
- uppercase cuando corresponda a una acción operacional principal.

Ejemplo:

`CONFIRMAR VENTA`

### 8.2 Acción secundaria

Debe tener menor jerarquía que la acción primaria.

Preferir borde/fondo neutro o violeta suave según contexto.

### 8.3 Acción destructiva

Rojo únicamente cuando la acción tiene semántica destructiva.

Ejemplo:

- quitar producto.

---

## 9. Acciones iconográficas

Cuando varias acciones frecuentes compiten por espacio horizontal, preferir iconos sobre etiquetas de texto si los iconos son suficientemente reconocibles.

Patrón aprobado en líneas de Pedido:

- Editar;
- Duplicar;
- Regalo;
- Quitar.

Referencia:

- área interactiva: `28x28px`;
- icono: ~14–16px;
- `rounded-md`;
- tooltip/title en español;
- `aria-label` descriptivo;
- estado hover visible;
- color semántico cuando corresponda.

El icono pequeño no implica reducir el área de interacción.

No utilizar iconos sin tooltip/aria-label cuando su significado pueda ser ambiguo.

---

## 10. Líneas de Pedido

Patrón aprobado:

`cantidad + producto | acciones iconográficas | precio`

Ejemplo conceptual:

`1x Helado Simple   [Editar] [Duplicar] [Regalo] [Quitar]   $3.500`

La metadata aparece debajo sólo cuando existe información relevante:

- sabores;
- formato;
- toppings;
- adicionales;
- notas;
- motivo de regalo.

Una línea simple no debe pagar el costo vertical de información inexistente.

---

## 11. Cierre de Pedido

Patrón aprobado:

`TOTAL | CONFIRMAR VENTA`

Ambos elementos comparten la misma franja horizontal.

Si existen descuentos o beneficios, el desglose se presenta inmediatamente encima.

No duplicar el total en el encabezado de Pedido ni en Contexto.

---

## 12. Estados vacíos

Los estados vacíos deben:

- explicar brevemente qué falta;
- ocupar poco espacio;
- utilizar borde dashed cuando ayude a distinguir el estado;
- usar texto secundario;
- evitar ilustraciones o bloques sobredimensionados en superficies operacionales.

Ejemplo:

`Aún no hay líneas agregadas.`

---

## 13. Errores, warnings y success

### Error

- rojo;
- mensaje concreto;
- asociado al control o acción que debe corregirse.

### Warning

- ámbar;
- utilizado cuando la operación puede requerir atención.

### Success

- verde;
- utilizado para confirmaciones o estados positivos.

Evitar exponer mensajes técnicos de API, provider o base de datos directamente al operador.

Los detalles técnicos deben registrarse por mecanismos de diagnóstico apropiados.

---

## 14. Shell y superficies

El shell de Plataforma Nook y el contenido de cada módulo cumplen responsabilidades distintas.

No repetir dentro de la superficie información que el shell ya comunica adecuadamente.

Ejemplo cerrado:

Si el shell muestra:

`Operación › POS`

el POS no necesita un encabezado adicional:

`Venta local / POS Operacional Nook`

---

## 15. Configuradores

Cuando una acción abre un configurador dentro de una superficie:

- debe utilizar la misma jerarquía de título de superficie;
- el producto configurado pasa a título de contenido;
- controles equivalentes mantienen alturas y tipografías estándar;
- el cierre debe privilegiar horizontalidad cuando sea viable.

La lógica que determina si un SKU requiere o no configurador es funcional y no forma parte de este estándar visual.

Backlog relacionado:

`DEV-UX-POS-03 — Optimizar flujo de configuración por SKU`

---

## 16. Preparación y otras superficies especializadas

POS UI Vocabulary v1 es el baseline, no una restricción absoluta.

Una superficie puede divergir cuando exista una necesidad funcional, ergonómica o de dispositivo documentada.

Caso principal:

### Preparation Station Mode

La estación dedicada de Preparación está orientada a tablet de aproximadamente 8–9 pulgadas y operación táctil.

Puede requerir:

- controles táctiles mayores;
- tipografía mayor;
- menos densidad;
- ausencia de sidebar;
- ausencia de navegación global;
- fullscreen;
- mayor énfasis en estados y acciones de transición.

Estas diferencias no constituyen una ruptura del Vocabulary si preservan:

- semántica;
- consistencia de estados;
- lenguaje visual Nook;
- accesibilidad;
- claridad operacional.

Cuando Preparación es utilizada por un usuario operacional normal desde Plataforma Nook, puede conservar el PlatformShell y adaptar su contenido al contexto disponible.

---

## 17. Regla de evolución

Cambios futuros al estándar deben:

1. surgir de una necesidad real observada;
2. evitar variantes arbitrarias;
3. comprobar si el patrón puede reutilizarse;
4. documentarse antes de propagarse masivamente.

Si una modificación afecta significativamente estas reglas, crear una nueva versión del Vocabulary en lugar de modificar silenciosamente el significado de v1.

---

## 18. Baseline aprobado

POS UI Vocabulary v1 quedó validado mediante:

`DEV-UX-ARCH-01.3A — Integrar POS`

Incluye las normalizaciones posteriores FIX/FIX2.

Desde este punto, nuevas integraciones de Plataforma Nook deben utilizar este documento como referencia visual inicial.

---
