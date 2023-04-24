export default `
:host {
    display: block;
    position: absolute;
    pointer-events: none;
}
#body {
    pointer-events: all;
    position: absolute;
    inset: 10px;

    background-color: wheat;
}

:host([float]) {
    height: calc(1px * var(--cell-size) * var(--widget-height));
    width: calc(1px * var(--cell-size) * var(--widget-width));

    top: var(--y);
    left: var(--x);

    z-index: 1;
}

:host(:not([float])) {
    height: calc(1px * var(--cell-size) * var(--widget-height));
    width: calc(1px * var(--cell-size) * var(--widget-width));

    top: calc(1px * var(--cell-size) * var(--grid-y));
    left: calc(1px * var(--cell-size) * var(--grid-x));

    transition-property: top, left;
    transition-duration: 250ms;
}
`