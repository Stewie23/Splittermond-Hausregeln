import {showElementIn} from "../../util/animatedDisplay";

export class ElementToggler{
    constructor(private readonly element:HTMLElement|null) {
    }

    show(){
        if(!this.element) return;
        showElementIn(this.element);
    }

    hide(){
        if(!this.element) return;
        this.element.style.display = 'none';
    }
}
