import SplittermondItemSheet from "./item-sheet.js";
import {foundryApi} from "../../api/foundryApi";

export default class SplittermondSpellSheet extends SplittermondItemSheet {
    static get defaultOptions() {
        return foundryApi.utils.mergeObject(super.defaultOptions, {
            classes: ["splittermond", "sheet", "item", "npcattack"]
        });
    }

    _getStatBlock() {


        
        return [
            {
                label: "splittermond.damage",
                value: this.item.system.damage
            },
            {
                label: "splittermond.range",
                value: this.item.system.range
            },
            {
                label: "splittermond.weaponSpeedAbbrev",
                value: this.item.system.weaponSpeed
            }
        ];
            
    }

}