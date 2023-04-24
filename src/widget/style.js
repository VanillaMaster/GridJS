export const style = `
:host {
    display: block;
    position: relative;
    pointer-events: none;
}
#body {
    pointer-events: all;
    position: absolute;
    inset: 10px;

    background-color: wheat;
}

:host([float]) {
    position: absolute;
    height: calc(1px * var(--cell-size) * var(--widget-height));
    width: calc(1px * var(--cell-size) * var(--widget-width));

    top: var(--y);
    left: var(--x);

    z-index: 1;
}

:host(:not([float])) {
    grid-row-start: var(--grid-y, 1);
    grid-row-end: calc(var(--grid-y, 1) + var(--widget-height, 1));
    grid-column-start: var(--grid-x, 1);
    grid-column-end: calc(var(--grid-x, 1) + var(--widget-width, 1));
}
`