import SplittermondWizard from "./wizard.js";
import {foundryApi} from "../../api/foundryApi";
import {splittermond} from "../../config";

export default class SplittermondSpeciesWizard extends SplittermondWizard {
    constructor(actor, item) {
        //super(app)
        super();
        this.actor = actor;
        this.species = item;

        this.attributeModifiers = {};
        let translator = {};

        CONFIG.splittermond.attributes.forEach(attr => {
            this.attributeModifiers[attr] = {
                label: `splittermond.attribute.${attr}.long`,
                value: 0,
                min: 0,
                max: 1
            }
            translator[game.i18n.localize(`splittermond.attribute.${attr}.short`).toLowerCase()] = attr;
        });

        item.system.attributeMod.split(',').forEach(elem => {
            let elemParts = elem.trim().split(" ");
            let attribute = translator[elemParts[0].toLowerCase()];
            let value = parseInt(elemParts[1]);
            if (attribute) {
                this.attributeModifiers[attribute].value = value;
                this.attributeModifiers[attribute].min = value;
                this.attributeModifiers[attribute].max = this.attributeModifiers[attribute].value + 1;
            }

        });

    }

    static get defaultOptions() {
        return foundryApi.utils.mergeObject(super.defaultOptions, {
            template: "systems/splittermond/templates/apps/wizards/species.hbs",
            classes: ["splittermond", "wizard", "species"]
        });
    }

    getData() {
        const data = super.getData();
        data.species = this.species;


        data.attributeModifiers = this.attributeModifiers;

        let sum = 0;
        CONFIG.splittermond.attributes.forEach(attr => {
            sum = sum + parseInt(data.attributeModifiers[attr].value);
        });

        CONFIG.splittermond.attributes.forEach(attr => {
            data.attributeModifiers[attr].incDisabled = data.attributeModifiers[attr].value >= data.attributeModifiers[attr].max || sum >= 2;
            data.attributeModifiers[attr].decDisabled = data.attributeModifiers[attr].value <= data.attributeModifiers[attr].min || sum <= 0;

        });
        data.ready = false;
        let template = "splittermond.wizard.distributeAttributemod";
        if (2 - sum > 1) {
            template = "splittermond.wizard.distributeAttributemodPlural";
        }

        if (sum === 2) {
            template = "splittermond.wizard.distributeAttributemodReady";
            data.ready = true;
        }

        data.message = game.i18n.format(template, { points: 2 - sum });

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('button[value="-1"], button[value="+1"]').click(event => {
            let value = parseInt(event.currentTarget.value);
            let attr = event.currentTarget.name;
            if (this.attributeModifiers[attr]) {
                this.attributeModifiers[attr].value += value;
                this.render(true);
            }
        });


    }

    _onSave(event) {
        super._onSave(event);

        const actorData = {
            attributes: {},
            species: {
                value: this.species.name,
                size: this.species.system.size
            }
        };

        splittermond.attributes.forEach(attr => {
            actorData.attributes[attr] = {
                species: this.attributeModifiers[attr].value
            };
        });

        this.actor.update({system:actorData});
    }




}