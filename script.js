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

    #counter = 1;
    /**@type { Map<number, Widget>} */
    #widgets = new Map();
    /**
     * @param { number } id 
     */
    getWidget(id) {
        return this.#widgets.get(id);
    }
    get widgets(){
        return this.#widgets;
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
        this.#widgets.delete(id);
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
        this.#minWidth = value;
    }

    #minWidth = 0;
    get minWidth() {
        return this.#minWidth;
    }
    set minWidth(value) {
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

    /**@type { number[] } */
    #affected = [];
    /**
     * @param { number } x__ 
     * @param { number } y__
     * @typedef { {x: number, id: number, delta: number} } xEdge
     * @typedef { {y: number, id: number, delta: number} } yEdge 
    */
    tryReoreder(x__, y__){
        while (this.#affected.length > 0) {
            this.grid.getWidget(/**@type {number}*/ (this.#affected.pop()))?.cancelShift();
        }
       /**@type {Map<number,[xEdge, xEdge]>} */
       const xEdges = new Map();
       /**@type {Map<number,[yEdge, yEdge]>} */
       const yEdges = new Map();

       /**@type { xEdge[] } */
        const Xs = [];
        {
            /**@type { [xEdge, xEdge] } */
            const xEdgesValue = [{
                x: (x__ * 3) + 1,
                id: this.#id,
                delta: 1
            }, {
                x: ((x__ + this.width) * 3) - 1,
                id: this.#id,
                delta: -1
            }];
            xEdges.set(this.#id, xEdgesValue);
            Array.prototype.push.apply(Xs, xEdgesValue);
        }

        /**@type { yEdge[] } */
        const Ys = [];
        {
            /**@type { [yEdge, yEdge] } */
            const yEdgesValue = [{
                y: (y__ * 3) + 1,
                id: this.#id,
                delta: 1
            }, {
                y: ((y__ + this.height) * 3) - 1,
                id: this.#id,
                delta: -1
            }];
            yEdges.set(this.#id, yEdgesValue);
            Array.prototype.push.apply(Ys, yEdgesValue);
        }

        const priorities = {
            [this.#id]: -1
        }
        
        for (const [key, value] of this.grid.widgets) {
            if (key === this.#id) continue
            priorities[key] = value.gridY;
            /**@type {[xEdge, xEdge]} */
            const xEdgesValue = [{
                x: (value.gridX * 3) + 1,
                id: key,
                delta: 1
            }, {
                x: ((value.gridX + value.width) * 3) - 1,
                id: key,
                delta: -1
            }];
            Array.prototype.push.apply(Xs, xEdgesValue);
            xEdges.set(key, xEdgesValue);
            /**@type {[yEdge, yEdge]} */
            const yEdgesValue = [{
                y: (value.gridY * 3) + 1,
                id: key,
                delta: 1
            }, {
                y: ((value.gridY + value.height) * 3) - 1,
                id: key,
                delta: -1,
            }];
            Array.prototype.push.apply(Ys, yEdgesValue);
            yEdges.set(key, yEdgesValue);
        }
        
        const xIntersections = new Set();
        const intersections = [];
        let d = 0;
        do {
            if (d > 10) debugger;
            xIntersections.clear();
            intersections.length = 0;

            //sort
            Xs.sort((a, b) => a.x - b.x);
            Ys.sort((a, b) => a.y - b.y);
    
            let i = 0, lastId = 0;
            for (const element of Xs) {
                i += element.delta;
                if (i > 1) { xIntersections.add(lastId > element.id? `${element.id}:${lastId}` : `${lastId}:${element.id}`); }
                if (element.delta == 1) lastId = element.id;
            }
            i = 0, lastId = 0;
            for (const element of Ys) {
                i += element.delta;
                if (i > 1) { 
                    if (xIntersections.has(lastId > element.id? `${element.id}:${lastId}` : `${lastId}:${element.id}`)) {
                        intersections.push(priorities[lastId] > priorities[element.id]?
                            [element.id, lastId] :
                            [lastId, element.id]
                        );
                    }
                }
                if (element.delta == 1) lastId = element.id;
            }

            //console.log(intersections);

            for (const [keepId, moveId] of intersections) {
                const keep = yEdges.get(keepId)?.[1];
                const move = yEdges.get(moveId)?.[0];
                if (keep == undefined || move == undefined) throw new Error("invalid id's");
                
                const deltaY = ((keep.y + 1) - (move.y - 1));
                //if (deltaY == 0) { debugger }
                const moveWidget = this.grid.getWidget(moveId);
                if (moveWidget == undefined) throw new Error("invalid id");
                moveWidget.shiftY += deltaY / 3;
                const [e1, e2] = /**@type {[yEdge, yEdge]}*/ (yEdges.get(moveId));
                e1.y += deltaY;
                e2.y += deltaY;
                this.#affected.push(moveId);
            }
            d++;
        } while (intersections.length > 0)
        

        //console.log(Xs, Ys);
        //console.log(intersections);
        return true;
    }

    saveReorder() {
        while (this.#affected.length > 0) {
            this.grid.getWidget(/**@type {number}*/(this.#affected.pop()))?.saveShift();
        }
    }

    /**
     * @param { number } x 
     * @param { number } y 
     */
    reorder(x, y) {
        if (this.tryReoreder(x, y)) {
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
        //this.grid.unbindeWidget(this.#id);
        this.gridX += this.shiftX;
        this.gridY += this.shiftY;

        this.x = (this.gridX) * this.grid.cellSize;
        this.y = (this.gridY) * this.grid.cellSize;

        this.shiftX = 0;
        this.shiftY = 0;
       // this.grid.bindeWidget(this.#id);
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
            //this.grid.unbindeWidget(this.#id);

            this.grid.style.setProperty("--shadow-height", `${this.height}`);
            this.grid.style.setProperty("--shadow-width", `${this.width}`);

            this.grid.style.setProperty("--shadow-x", `${this.gridX + 1}`);
            this.grid.style.setProperty("--shadow-y", `${this.gridY + 1}`);
            

            this.setAttribute("float", "");
        } else {

            this.saveReorder();

            //this.grid.bindeWidget(this.#id)

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