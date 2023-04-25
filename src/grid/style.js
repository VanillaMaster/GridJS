export default `
#content {
    width: calc(var(--cell-size) * var(--grid-width) * 1px);
    height: calc(var(--cell-size) * var(--grid-height) * 1px);
    position: relative;
}
:host {
    display: block;
    touch-action:none;
    user-select: none;
}
:host([data-edit="true"]) .shadow {
    display:block;
}
:host([data-edit="false"]) .shadow {
    display:none;
}
.shadow {
    background-color: var(--shaodw-color);
    
    height: calc(1px * var(--cell-size) * var(--shadow-height));
    width: calc(1px * var(--cell-size) * var(--shadow-width));

    top: calc(1px * var(--cell-size) * var(--shadow-y));
    left: calc(1px * var(--cell-size) * var(--shadow-x));

    position: absolute;
}
`;