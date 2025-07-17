import SplittermondWizard from "./wizard";
import {foundryApi} from "../../api/foundryApi";
import {splittermond} from "../../config";
import {ApplicationContextOptions, ApplicationRenderContext} from "../../data/SplittermondApplication";
import SplittermondActor from "../../actor/actor";
import SplittermondItem from "../../item/item";
import {SpeciesDataModel} from "../../item/dataModel/SpeciesDataModel";

type AttributeModifier = {
    label: string;
    value: number;
    min: number;
    max: number;
    incDisabled?: boolean;
    decDisabled?: boolean;
};

type AttributeModifiers = Record<string, AttributeModifier>;
type SplittermondSpecies = SplittermondItem & {system: SpeciesDataModel}

export default class SplittermondSpeciesWizard extends SplittermondWizard {
    static DEFAULT_OPTIONS = {
        tag:"form",
        classes: ["splittermond", "wizard", "species"],
        window: {
            title: "Species Wizard",
        }
    };

    static PARTS = {
        form: {
            template: "systems/splittermond/templates/apps/wizards/species.hbs",
        }
    };

    actor: SplittermondActor;
    species: SplittermondSpecies;
    attributeModifiers: AttributeModifiers;

    constructor(actor: SplittermondActor, item: SplittermondSpecies) {
        super();
        this.actor = actor;
        this.species = item;

        this.attributeModifiers = {};
        const translator: Record<string, string> = {};

        splittermond.attributes.forEach((attr: string) => {
            this.attributeModifiers[attr] = {
                label: `splittermond.attribute.${attr}.long`,
                value: 0,
                min: 0,
                max: 1
            };
            translator[foundryApi.localize(`splittermond.attribute.${attr}.short`).toLowerCase()] = attr;
        });

        (item.system.attributeMod??"").split(',').forEach((elem: string) => {
            const elemParts = elem.trim().split(" ");
            const attribute = translator[elemParts[0].toLowerCase()];
            const value = parseInt(elemParts[1]);
            if (attribute) {
                this.attributeModifiers[attribute].value = value;
                this.attributeModifiers[attribute].min = value;
                this.attributeModifiers[attribute].max = this.attributeModifiers[attribute].value + 1;
            }
        });
    }

    async _prepareContext(options: ApplicationContextOptions) {
        const data = await super._prepareContext(options);
        data.species = this.species;
        data.attributeModifiers = this.attributeModifiers;

        let sum = 0;
        splittermond.attributes.forEach((attr: string) => {
            sum += this.attributeModifiers[attr].value;
        });

        splittermond.attributes.forEach((attr: string) => {
            //we know these are AttributeModifiers, we just set them above
            (data.attributeModifiers as AttributeModifiers)[attr].incDisabled = this.attributeModifiers[attr].value >= this.attributeModifiers[attr].max || sum >= 2;
            (data.attributeModifiers as AttributeModifiers)[attr].decDisabled = this.attributeModifiers[attr].value <= this.attributeModifiers[attr].min || sum <= 0;
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

        data.message = foundryApi.format(template, { points: `${2 - sum}` });

        return data;
    }

    async _onRender(context: ApplicationRenderContext, options?: ApplicationContextOptions) {
        await super._onRender(context, options);

        // Replace jQuery with direct DOM manipulation
        this.element.querySelectorAll('button[value="-1"], button[value="+1"]').forEach(btn => {
            btn.addEventListener('click', (event: Event) => {
                const target = event.currentTarget as HTMLButtonElement;
                const value = parseInt(target.value);
                const attr = target.name;
                if (this.attributeModifiers[attr]) {
                    this.attributeModifiers[attr].value += value;
                    this.render(true);
                }
            });
        });
    }

    protected _onSaveEvent() {
        const actorData: any = {
            attributes: {},
            species: {
                value: this.species.name,
                size: this.species.system.size
            }
        };

        splittermond.attributes.forEach((attr: string) => {
            actorData.attributes[attr] = {
                species: this.attributeModifiers[attr].value
            };
        });

        this.actor.update({ system: actorData });
    }

    protected _onCancelEvent(): void {
        // No additional logic needed for cancel in this wizard
    }
}