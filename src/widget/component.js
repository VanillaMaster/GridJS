import { Grid } from "../grid/component.js";
import style from "./style.js";

export class Widget extends HTMLElement {
    static template = (new Range()).createContextualFragment(`<div id="body"><slot></slot></div>`);
    static style = new CSSStyleSheet();
    static {
        this.style.replace(style);
    }
    constructor() {
        super();

        this.#shadow = this.attachShadow({ mode: "closed" });
        this.#shadow.adoptedStyleSheets = [Widget.style];
        this.#shadow.append(Widget.template.cloneNode(true));

        this.style.setProperty("--widget-height", `${this.#height}`);
        this.style.setProperty("--widget-width", `${this.#width}`);
    }

    #shadow;

    #id = 0;
    /**@type { Set<string> } */
    #reorederCache = new Set();

    /**@type { number[] } */
    #affected = [];
    /**
     * @param { number } x 
     * @param { number } y
     */
    tryReoreder(x, y) {
        /**
         * @typedef { {x: number, id: number, delta: number} } xEdge
         * @typedef { {y: number, id: number, delta: number} } yEdge 
         */
        /**@type {Map<number,[xEdge, xEdge]>} */
        const xEdges = new Map();
        /**@type {Map<number,[yEdge, yEdge]>} */
        const yEdges = new Map();

        /**@type { xEdge[] } */
        const Xs = [];
        {
            /**@type { [xEdge, xEdge] } */
            const xEdgesValue = [{
                x: (x * 3) + 1,
                id: this.#id,
                delta: 1
            }, {
                x: ((x + this.width) * 3) - 1,
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
                y: (y * 3) + 1,
                id: this.#id,
                delta: 1
            }, {
                y: ((y + this.height) * 3) - 1,
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

        /**@type {Set<string>} */
        const xIntersections = new Set();
        /**@type { {[id: number]: number } } */
        const shifts = {};
        let workLeft = false;
        do {
            workLeft = false;
            xIntersections.clear();

            //sort
            Xs.sort((a, b) => a.x - b.x);
            Ys.sort((a, b) => a.y - b.y);

            let i = 0;
            const lastIds = new Set();
            for (const element of Xs) {
                i += element.delta;
                if (i > 1 && element.delta > 0) {
                    for (const id of lastIds) {
                        xIntersections.add(id > element.id ? `${element.id}:${id}` : `${id}:${element.id}`)
                    }
                }
                if (element.delta == 1) lastIds.add(element.id);
                if (element.delta == -1) lastIds.delete(element.id);
            }
            i = 0;
            lastIds.clear();

            for (const element of Ys) {
                i += element.delta;
                if (i > 1 && element.delta > 0) {
                    for (const id of lastIds) {
                        if (xIntersections.has(id > element.id ? `${element.id}:${id}` : `${id}:${element.id}`)) {
                            const order = priorities[id] > priorities[element.id];
                            const keepId = order? element.id : id;
                            const moveId = order? id : element.id;
                            // ============
                            {
                                workLeft = true;
                                const keep = yEdges.get(keepId)?.[1];
                                const move = yEdges.get(moveId)?.[0];
                                if (keep == undefined || move == undefined) throw new Error("invalid id's");
                
                                const deltaY = ((keep.y + 1) - (move.y - 1));
                                shifts[moveId] = (shifts[moveId] ?? 0) + deltaY / 3;
                                const [e1, e2] = /**@type {[yEdge, yEdge]}*/ (yEdges.get(moveId));
                                e1.y += deltaY;
                                e2.y += deltaY;
                                if (((e2.y + 1) / 3) > this.grid.height) {
                                    return false;
                                }
                            }
                        }
                    }
                }
                if (element.delta == 1) lastIds.add(element.id);
                if (element.delta == -1) lastIds.delete(element.id);
            }
        } while (workLeft)

        this.cancelReorder();

        for (const strId in shifts) {
            const id = parseInt(strId);
            const moveWidget = this.grid.getWidget(id);
            if (moveWidget == undefined) throw new Error("invalid id");
            moveWidget.shiftY = shifts[strId];
            this.#affected.push(id);
        }

        return true;
    }

    saveReorder() {
        while (this.#affected.length > 0) {
            this.grid.getWidget(/**@type {number}*/(this.#affected.pop()))?.saveShift();
        }
    }

    cancelReorder() {
        while (this.#affected.length > 0) {
            this.grid.getWidget(/**@type {number}*/(this.#affected.pop()))?.cancelShift();
        }
    }

    /**
     * @param { number } x 
     * @param { number } y 
     */
    reorder(x, y) {
        const key = `${x}:${y}`;
        if (!(this.#reorederCache.has(key))) {
            console.time("re");
            if (this.tryReoreder(x, y)) {
                this.gridX = x;
                this.gridY = y;
            } else {
                this.#reorederCache.add(`${x}:${y}`);
            }
            console.timeEnd("re")
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
        this.style.setProperty("--grid-x", `${this.gridX/* + 1*/ + value}`);
    }
    #shiftY = 0;
    get shiftY() {
        return this.#shiftY;
    } set shiftY(value) {
        this.style.setProperty("--grid-y", `${this.gridY/* + 1*/ + value}`);
        this.#shiftY = value;
    }

    saveShift() {
        this.gridX += this.shiftX;
        this.gridY += this.shiftY;

        this.x = (this.gridX) * this.grid.cellSize;
        this.y = (this.gridY) * this.grid.cellSize;

        this.shiftX = 0;
        this.shiftY = 0;
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
            this.style.setProperty("--grid-x", `${value /*+ 1*/}`);
            this.grid.style.setProperty("--shadow-x", `${value/* + 1*/}`)
            this.#gridX = value;
        }
    }

    #gridY = 0;
    get gridY() {
        return this.#gridY;
    }
    set gridY(value) {
        if (this.#gridY !== value) {
            this.style.setProperty("--grid-y", `${value/* + 1*/}`);
            this.grid.style.setProperty("--shadow-y", `${value/* + 1*/}`)
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

    /**@type { types.Grid | undefined } */
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
            this.x = (this.gridX) * this.grid.cellSize;
            this.y = (this.gridY) * this.grid.cellSize;

            this.grid.style.setProperty("--shadow-height", `${this.height}`);
            this.grid.style.setProperty("--shadow-width", `${this.width}`);

            this.grid.style.setProperty("--shadow-x", `${this.gridX/* + 1*/}`);
            this.grid.style.setProperty("--shadow-y", `${this.gridY/* + 1*/}`);


            this.setAttribute("float", "");
        } else {
            this.saveReorder();
            this.#reorederCache.clear();

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

    this.removeEventListener("pointermove", /**@type { any }*/(pointermove));

    this.float = false;
    this.grid.locked = false;
}