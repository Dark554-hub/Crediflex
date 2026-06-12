# Crediflex - Guia de revision del MVP

## Objetivo

Validar con el cliente si el flujo principal de cobranza sirve para operar en campo desde celular.

## Que probar primero

1. Abrir el panel principal.
2. Entrar a **Cobros del dia**.
3. Seleccionar un cliente.
4. Elegir el credito que se va a cobrar.
5. Registrar un pago.
6. Abrir el comprobante del pago.
7. Revisar el perfil del cliente.
8. Abrir un credito nuevo normal.
9. Abrir un credito express.
10. Probar renovacion desde un credito liquidado.

## Puntos a revisar con el cliente

- Si la lista de cobro diario muestra la informacion suficiente.
- Si es claro elegir entre varios creditos del mismo cliente.
- Si los montos sugeridos para pago son correctos.
- Si el comprobante de pago contiene lo necesario.
- Si el calculo de liquidacion coincide con su forma de operar.
- Si el credito express se entiende y se calcula bien.
- Si los clientes liquidados deben verse en otro lugar o quedarse como estan.
- Si los nombres de botones y pantallas son claros para uso en campo.

## Datos de prueba

El sistema tiene clientes de ejemplo para Motul e Izamal.

- Hay clientes con creditos normales.
- Hay clientes con creditos express.
- Hay un cliente con varios creditos para probar seleccion de credito.
- Los creditos liquidados quedan en segundo plano y se pueden renovar desde el perfil del cliente.

## Feedback esperado

Pedir cambios en este formato:

```text
Pantalla:
Que estaba intentando hacer:
Que esperaba ver:
Que paso:
Cambio solicitado:
```

## Pendientes naturales para la siguiente etapa

- Ajustes finos a reglas de liquidacion.
- Ajustes al comprobante PDF.
- Reportes/exportaciones.
- Permisos por usuario si se agregan mas cobradores.
- Preparacion final de deploy en Vercel.
