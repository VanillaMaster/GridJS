class Grid extends HTMLElement {
    static observer = new ResizeObserver((entries) => {

        for (const entry of /**@type {(ResizeObserverEntry & {target: Grid})[]}*/(entries)) {
            const { height, width } = entry.contentRect;
            entry.target.#height = Math.trunc(height / entry.target.#cellSize);
            entry.target.#width = Math.trunc(width / entry.target.#cellSize);

            entry.target.minWidth = Math.max(entry.target.width, entry.target.minWidth);
            entry.target.minHeight = Math.max(entry.target.height, entry.target.minHeight);

            //console.log(entry.target.#matrix);

            entry.target.style.setProperty("--grid-height", `${entry.target.#height}`)
            entry.target.style.setProperty("--grid-width", `${entry.target.#width}`)
        }
    });
    static template = (new Range()).createContextualFragment(`<div id="content"><div class="shadow"></div><slot></slot></div>`);
    static style = new CSSStyleSheet();
    static {
        this.style.replace(`
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
        `);
    }
    static get observedAttributes() { return ["cell-size"]; }

    /**
    * @type { {[key: string]: (this: Grid, oldValue: string, newValue: string) => void} }
    */
    static #attributeHandlers = {
        ["cell-size"](oldValue, newValue) {
            this.#cellSize = parseInt(newValue);
            this.style.setProperty("--cell-size", `${this.#cellSize}`);
        }
    }

    constructor() {
        super();
        this.#shadow = this.attachShadow({ mode: "closed" });
        this.#shadow.adoptedStyleSheets = [Grid.style];
        this.#shadow.append(Grid.template.cloneNode(true));
    }

    /**@type {number[][]} */
    #matrix = [];

    get matrix() {
        // /**@type { number[][] } */
        // const copy = new Array(this.matrix.length);
        // for (let i = 0; i < this.#matrix.length; i++) {
        //     copy[i] = [...this.#matrix[i]];
        // }
        // return copy;
        return this.#matrix;
    }

    #counter = 1;
    /**@type { Map<number, Widget>} */
    #widgets = new Map();
    /**
     * @param { number } id 
     */
    getWidget(id) {
        return this.#widgets.get(id);
    }
    /**
     * @param { Widget } element 
     */
    registerWidget(element) {
        const id = this.#counter++;
        this.#widgets.set(id, element)
        return id;
    }
    /**
     * @param { number } id 
     */
    unregisterWidget(id) {
        this.unbindeWidget(id);
        this.#widgets.delete(id);
    }

    /**
     * @param { number } id 
     */
    unbindeWidget(id) {
        const widget = this.#widgets.get(id);
        if (widget == undefined) throw new Error("invalid id");
        const deltaX = widget.gridX;
        for (let x = 0; x < widget.width; x++) {
            const deltaY = widget.gridY;
            for (let y = 0; y < widget.height; y++) {
                this.#matrix[deltaY + y][deltaX + x] = 0;
            }
        }
    }
    /**
     * @param { number } id 
     */
    bindeWidget(id) {
        const widget = this.#widgets.get(id);
        if (widget == undefined) throw new Error("invalid id");
        const deltaX = widget.gridX;
        for (let x = 0; x < widget.width; x++) {
            const deltaY = widget.gridY;
            for (let y = 0; y < widget.height; y++) {
                this.#matrix[deltaY + y][deltaX + x] = id;
            }
        }
    }

    #shadow;
    /**@type {number} */
    #cellSize = 0;
    get cellSize() {
        return this.#cellSize
    }

    #minHeight = 0;
    get minHeight() {
        return this.#minHeight;
    }
    set minHeight(value) {
        if (this.#matrix.length < value) {
            let i = this.#matrix.length;
            this.#matrix.length = value;
            for (; i < this.#matrix.length; i++) {
                this.#matrix[i] = new Array(this.#minHeight).fill(0);
            }
        } else {
            this.#matrix.length = value;
        }
        this.#minWidth = value;
    }

    #minWidth = 0;
    get minWidth() {
        return this.#minWidth;
    }
    set minWidth(value) {
        for (const line of this.#matrix) {
            if (line.length < value) {
                let i = line.length;
                line.length = value;
                for (; i < line.length; i++) {
                    line[i] = 0;
                }
            } else {
                line.length = value;
            }
        }
        this.#minHeight = value;
    }


    #height = 0;
    get height() {
        return this.#height;
    }
    #width = 0;
    get width() {
        return this.#width;
    }


    #locked = false;
    get locked() {
        return this.#locked;
    }

    set locked(value) {
        this.#locked = value;
    }

    connectedCallback() {
        Grid.observer.observe(this)
    }
    disconnectedCallback() {
        Grid.observer.unobserve(this)
    }
    /**
     * @param { string } name 
     * @param { string } oldValue 
     * @param { string } newValue 
     */
    attributeChangedCallback(name, oldValue, newValue) {
        Grid.#attributeHandlers[name].call(this, oldValue, newValue);
    }
}

customElements.define("widget-grid", Grid);

class Widget extends HTMLElement {
    static template = (new Range()).createContextualFragment(`<div id="body"><slot></slot></div>`);
    static style = new CSSStyleSheet();
    static {
        this.style.replace(`
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
        `);
    }
    constructor() {
        super();

        this.#shadow = this.attachShadow({mode: "closed"});
        this.#shadow.adoptedStyleSheets = [Widget.style];
        this.#shadow.append(Widget.template.cloneNode(true));

        this.style.setProperty("--widget-height", `${this.#height}`);
        this.style.setProperty("--widget-width", `${this.#width}`);
    }

    #shadow;

    #id = 0;

    #affected = /**@type { [Map<Number, Number>, Map<Number, Number>, Map<Number, Number>] }*/([new Map(), new Map(), new Map()]);
    
    /**
     * @param { number } x__ 
     * @param { number } y__
     */
    tryReoreder(x__, y__){
        //const ids = this.#affected[2];
        const matrix__ = this.grid.matrix.map( line => line.map( num => num == 0? [] : [num] ) );
        //console.log(matrix__);
        /**@type { ([number, number])[] } */
        const coordinates = [];
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                const y_ = y__ + i
                const x_ = x__ + j;
                if (matrix__[y_][x_].push(this.#id) > 1) {
                    coordinates.push([x_, y_]);
                }
            }
        }

        let impossible = false;
        while (coordinates.length > 0) {
            const [x, y] = /**@type {(typeof coordinates)[Number]}*/(coordinates.pop());
            /**@type { number } */
            const id = /**@type {any}*/(matrix__[y][x].shift());
            const Y = y + 1;
            if (Y >= matrix__.length) {
                impossible = true;
                break;
            }
            if (matrix__[Y][x].push(id) > 1) {
                coordinates.push([Y, x]);
            }
        }

        console.log(impossible);
        console.log(matrix__);


        const ids = new Set();
        ids.clear();

        for (const id of subMatrixElements(this.grid.matrix, x__, y__, this.width, this.height)) {
            if (id === 0 || id === this.#id) continue;
            ids.add(id);
        }

        const matrix = this.grid.matrix; 
        const iMax = matrix.length - 1;
        for (let i = 0; i < iMax; i++) {
            const line = this.grid.matrix[i];
            for (let j = 0; j < line.length; j++) {
                const target = matrix[i][j];
                if (ids.has(target)) {
                    const widget = this.grid.getWidget(target);
                    const shift = widget.shiftY;
                    const row = i + 1 + shift;
                    if (row < matrix.length) {
                        const id = matrix[i + 1 + shift][j]; 
                        if (id !== 0) {
                            ids.add(id);
                        }
                    }
                }
            }
        }

        if (ids.size === 0) return 0;

        const space = this.grid.height - (y__ + this.height);
        let hiegh = Infinity;
        let low = -Infinity;
        for (const id of ids) {
            const widget = this.grid.getWidget(id);
            hiegh = Math.min(hiegh, (widget.gridY));
            low = Math.max(low, (widget.gridY + widget.height));
        }
        const height = low - hiegh;
        const shift = (y__ + this.height) - hiegh;
        console.log(space, height);
        console.log(shift);
        
        //console.log(this.grid.matrix);
        //console.log(ids);
        
        return space >= height? shift : -1;
    }

    /**
     * @param { number } x 
     * @param { number } y
     * @param { number } shift
     */
    performReorder(x, y, shift) {
        const current = this.#affected[0];
        const next = this.#affected[2];
        this.#affected[2] = this.#affected[1];
        this.#affected[1] = next;

        for (const id of next) {
            console.log("shift:", id);
            current.delete(id);

            const widget = this.grid.getWidget(id);
            widget.shiftY = shift;
        }
        for (const id of current) {
            console.log("release:", id);
            const widget = this.grid.getWidget(id);
            widget.cancelShift();
        }

        this.#affected[0] = next;
        this.#affected[1] = current;
    }

    saveReorder() {
        const [current] = this.#affected;
        for (const id of current) {
            const widget = this.grid.getWidget(id);
            widget.saveShift()
            this.grid.unbindeWidget(id);
        }
        current.clear();
    }

    /**
     * @param { number } x 
     * @param { number } y 
     */
    reorder(x, y) {
        const shift = this.tryReoreder(x, y);
        if (shift !== -1) {
            this.performReorder(x, y, shift);
            this.gridX = x;
            this.gridY = y;
        }
    }

    connectedCallback() {
        if (this.parentElement instanceof Grid) {
            this.#grid = this.parentElement;
            this.#id = this.grid.registerWidget(this);
            this.addEventListener("pointerdown", /**@type { any }*/(pointerdown));
        }
    }

    #shiftX = 0;
    get shiftX() {
        return this.#shiftX;
    }
    set shiftX(value) {
        this.#shiftX = value;
        this.style.setProperty("--grid-x", `${this.gridX + 1 + value}`);
    }
    #shiftY = 0;
    get shiftY() {
        return this.#shiftY;
    }set shiftY(value) {
        this.style.setProperty("--grid-y", `${this.gridY + 1 + value}`);
        this.#shiftY = value;
    }

    saveShift() {
        this.grid.unbindeWidget(this.#id);
        this.gridX += this.shiftX;
        this.gridY += this.shiftY;

        this.x = (this.gridX) * this.grid.cellSize;
        this.y = (this.gridY) * this.grid.cellSize;

        this.grid.bindeWidget(this.#id);
    }
    cancelShift() {
        this.shiftX = 0;
        this.shiftY = 0;
    }


    #x = 0;
    get x() {
        return this.#x;
    }
    set x(value) {
        this.#x = value;
        this.style.setProperty("--x", `${value}px`);
    }

    #y = 0;
    get y() {
        return this.#y;
    }
    set y(value) {
        this.#y = value;
        this.style.setProperty("--y", `${value}px`)
    }

    #gridX = 0;
    get gridX() {
        return this.#gridX;
    }
    set gridX(value) {
        if (this.#gridX !== value) {
            this.style.setProperty("--grid-x", `${value + 1}`);
            this.grid.style.setProperty("--shadow-x", `${value + 1}`)
            this.#gridX = value;
        }
    }

    #gridY = 0;
    get gridY() {
        return this.#gridY;
    }
    set gridY(value) {
        if (this.#gridY !== value) {
            this.style.setProperty("--grid-y", `${value + 1}`);
            this.grid.style.setProperty("--shadow-y", `${value + 1}`)
            this.#gridY = value;
        }
    }

    #height = 2;
    get height() {
        return this.#height;
    }
    set height(value) {
        this.#height = value;
        this.style.setProperty("--widget-height", `${value}`);
    }

    #width = 2;
    get width() {
        return this.#width;
    }
    set width(value) {
        this.#width = value;
        this.style.setProperty("--widget-width", `${value}`);
    }

    /**@type { Grid | undefined } */
    #grid;
    get grid() {
        if (this.#grid == undefined) throw new Error("no grid found");
        return this.#grid;
    }

    #float = false;
    get float() {
        return this.#float;
    }

    set float(value) {
        this.#float = value;
        this.grid.dataset.edit = `${value}`;
        if (value) {
            this.grid.unbindeWidget(this.#id);

            this.grid.style.setProperty("--shadow-height", `${this.height}`);
            this.grid.style.setProperty("--shadow-width", `${this.width}`);

            this.grid.style.setProperty("--shadow-x", `${this.gridX + 1}`);
            this.grid.style.setProperty("--shadow-y", `${this.gridY + 1}`);
            

            this.setAttribute("float", "");
        } else {

            this.saveReorder();

            this.grid.bindeWidget(this.#id)

            this.x = (this.gridX) * this.grid.cellSize;
            this.y = (this.gridY) * this.grid.cellSize;

            this.removeAttribute("float");
        }
    }
}

customElements.define("widget-container", Widget);

/**
 * @this { Widget }
 * @param {PointerEvent} e 
 */
function pointerdown(e) {
    if (this.grid.locked) return;
    this.grid.locked = true;
    this.setPointerCapture(e.pointerId)
    this.addEventListener("pointermove", /**@type { any }*/(pointermove))
    this.addEventListener("pointerup", /**@type { any }*/(pointerup), { once: true });
    this.float = true;
}

/**
 * @this { Widget }
 * @param {PointerEvent} e 
 */
function pointermove(e) {
    this.x += e.movementX;
    this.y += e.movementY;

    const cellSize = this.grid.cellSize;
    const halfCellSize = cellSize / 2;
    const x = Math.max(Math.min(Math.trunc((this.x + halfCellSize) / cellSize), this.grid.width - this.width), 0);
    const y = Math.max(Math.min(Math.trunc((this.y + halfCellSize) / cellSize), this.grid.height - this.height), 0);
    
    if (this.gridX !== x || this.gridY !== y) { this.reorder(x, y); }

}

/**
 * @this { Widget }
 * @param {PointerEvent} e 
 */
function pointerup(e) {
    this.releasePointerCapture(e.pointerId);

    this.grid.minWidth = Math.max(this.grid.width, this.gridX + this.width);
    this.grid.minHeight = Math.max(this.grid.height, this.gridY + this.height);

    //console.log(this.grid.matrix);

    this.removeEventListener("pointermove", /**@type { any }*/(pointermove));

    this.float = false;
    this.grid.locked = false;
}

// UTILS

/**
 * @param { number[][] } source 
 * @param { number } x 
 * @param { number } y 
 * @param { number } width 
 * @param { number } height
 * @returns { Generator<number, void, void> }
 */
function* subMatrixElements(source, x, y, width, height) {
    for (let shiftX = 0; shiftX < width; shiftX++) {
        for (let shiftY = 0; shiftY < height; shiftY++) {
            const id = source[y + shiftY][x + shiftX];
            yield id;
        }
    }
    return;
}