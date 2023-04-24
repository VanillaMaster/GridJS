import style from "./style.js";

export class Grid extends HTMLElement {
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
        this.style.replace(style)
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
    /**@type { Map<number, types.Widget>} */
    #widgets = new Map();
    /**
     * @param { number } id 
     */
    getWidget(id) {
        return this.#widgets.get(id);
    }
    get widgets() {
        return this.#widgets;
    }
    /**
     * @param { types.Widget } element 
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