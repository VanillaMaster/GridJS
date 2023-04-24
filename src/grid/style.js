export default `
#content {
    width: calc(var(--cell-size) * var(--grid-width) * 1px);
    height: calc(var(--cell-size) * var(--grid-height) * 1px);
    position: relative;
}
:host([data-edit="true"]) .shadow {
    display:block;
}
:host([data-edit="false"]) .shadow {
    display:none;
}
.shadow {
    background-color: aquamarine;
    
    height: calc(1px * var(--cell-size) * var(--shadow-height));
    width: calc(1px * var(--cell-size) * var(--shadow-width));

    top: calc(1px * var(--cell-size) * var(--shadow-y));
    left: calc(1px * var(--cell-size) * var(--shadow-x));

    /*grid-row-start: var(--shadow-y, 1);*/
    /*grid-row-end: calc(var(--shadow-y, 1) + var(--shadow-height, 0));*/
    /*grid-column-start: var(--shadow-x, 1);*/
    /*grid-column-end: calc(var(--shadow-x, 1) + var(--shadow-width, 0));*/

    position: absolute;
}
`;