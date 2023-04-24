export const style = `
#content {
    width: calc(var(--cell-size) * var(--grid-width) * 1px);
    height: calc(var(--cell-size) * var(--grid-height) * 1px);
    position: relative;

    display: grid;

    grid-template-rows: repeat(var(--grid-height, 1), 1fr);
    grid-template-columns: repeat(var(--grid-width, 1), 1fr);
}
:host([data-edit="true"]) .shadow {
    display:block;
}
:host([data-edit="false"]) .shadow {
    display:none;
}
.shadow {
    background-color: aquamarine;
    
    grid-row-start: var(--shadow-y, 1);
    grid-row-end: calc(var(--shadow-y, 1) + var(--shadow-height, 0));
    grid-column-start: var(--shadow-x, 1);
    grid-column-end: calc(var(--shadow-x, 1) + var(--shadow-width, 0));

    display: none;
}
`;