export default `
:host {
    display: block;
    position: absolute;
    pointer-events: none;

    min-height: calc(1px * var(--cell-size));
    min-width: calc(1px * var(--cell-size));

    transition-duration: var(--widget-transition-duration, 250ms);
    transition-property: none;

    height: calc(1px * ((var(--cell-size) * var(--height)) + var(--delta-height, 0)));
    width: calc(1px * ((var(--cell-size) * var(--width)) + var(--delta-width, 0)));

    left: calc(1px * ((var(--cell-size) * var(--x, 0)) + var(--delta-x, 0)));
    top: calc(1px * ((var(--cell-size) * var(--y, 0)) + var(--delta-y, 0)));
}
#body {
    pointer-events: all;
    position: absolute;
    inset: 10px;

    background-color: var(--widget-color);
}
#handle {
    position: absolute;
    right: 10px;
    bottom: 10px;
    cursor: nw-resize;
    z-index: 99;
}

:host(:not([float]):not([edit])) {
    transition-property: top, left, width, height;
}

:host(:not(:hover)) #handle {
    opacity: 0;
}

:host([float]) {
    z-index: 1;
}

:host(:not([float])) {

}
`