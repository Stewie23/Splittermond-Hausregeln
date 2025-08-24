import * as Tooltip from "../../util/tooltip.js"
import {splittermond} from "../../config.js";
import {foundryApi} from "../../api/foundryApi";
import {DamageInitializer} from "../../util/chat/damageChatMessage/initDamage";
import {ItemFeaturesModel} from "../../item/dataModel/propertyModels/ItemFeaturesModel.js";
import {DamageRoll} from "../../util/damage/DamageRoll.js";
import {CostBase} from "../../util/costs/costTypes.js";
import {parseAvailableIn, selectFromAllSkills, selectFromParsedSkills} from "./parseAvailableIn";

// NEW: import the canonical attribute list
import { attributes } from "../../config/attributes.js";

export default class SplittermondActorSheet extends foundry.appv1.sheets.ActorSheet {
    constructor(...args) {
        super(...args);
        this._hoverOverlays = [];
        this._hideSkills = true;
    }

    static get defaultOptions() {
        return foundryApi.utils.mergeObject(super.defaultOptions, {
            classes: ["splittermond", "sheet", "actor"]
        });
    }

    async getData() {
        const sheetData = super.getData();

        Handlebars.registerHelper('modifierFormat', (data) => parseInt(data) > 0 ? "+" + parseInt(data) : data);

        sheetData.hideSkills = this._hideSkills;
        sheetData.generalSkills = {};
        CONFIG.splittermond.skillGroups.general.filter(s => !sheetData.hideSkills
            || ["acrobatics", "athletics", "determination", "stealth", "perception", "endurance"].includes(s)
            || this.actor.skills[s].points > 0
            || this.actor.items.find(i => i.type === "mastery" && i.system.skill === s)).forEach(skill => {
                sheetData.generalSkills[skill] = this.actor.skills[skill];
            });
        sheetData.magicSkills = {};
        CONFIG.splittermond.skillGroups.magic.filter(s => !sheetData.hideSkills
            || this.actor.skills[s].points > 0
            || this.actor.items.find(i => i.type === "mastery" && i.system.skill === s)).forEach(skill => {
                sheetData.magicSkills[skill] = this.actor.skills[skill];
            });

        sheetData.fightingSkills = {};
        CONFIG.splittermond.skillGroups.fighting.filter(s => !sheetData.hideSkills
            || (sheetData.data.system.skills[s]?.points || 0) > 0
            || this.actor.items.find(i => i.type === "mastery" && i.system.skill === s)).forEach(skill => {
                if (!sheetData.data.system.skills[skill]) {
                    sheetData.data.system[skill] = {
                        points: 0
                    }
                }
                sheetData.fightingSkills[skill] = duplicate(sheetData.data.system.skills[skill]);
                sheetData.fightingSkills[skill].label = `splittermond.skillLabel.${skill}`;
            });

        sheetData.data.system.biographyHTML = await TextEditor.enrichHTML(sheetData.data.system.biography, {
            relativeTo: this.actor,
            rolls: true,
            links: true,
            documents: true,
            secrets: true,
            async: true
        });

        this._prepareItems(sheetData);
        sheetData.attacks= mapAttacks(sheetData.actor);
        sheetData.activeDefense = sheetData.actor.activeDefense;

        // NEW: provide attribute keys and labels for the dropdowns
        sheetData.attributeKeys = Array.from(attributes);
        const attrObj = this.actor.attributes ?? {};
        sheetData.attributeLabelKeys = Object.fromEntries(
            sheetData.attributeKeys.map(k => [k, attrObj[k]?.label?.short ?? `splittermond.attribute.${k}.short`])
        );

        // register eq helper once
        if (!Handlebars.helpers.eq) {
            Handlebars.registerHelper("eq", (a,b)=>a===b);
        }

        console.debug("Splittermond | got actor data");
        return sheetData;
    }

    // ... unchanged _prepareItems, _getClosestData, etc.

    activateListeners(html) {
        // ... all your existing listeners ...

        // NEW: handle <select class="skill-attr-select"> changes
        html.find(".skill-attr-select").on("change", async (ev) => {
            const el = ev.currentTarget;
            const skillId = el.dataset.skill;
            const which   = Number(el.dataset.which); // 0 or 1

            const defaults = splittermond.skillAttributes[skillId] ?? [];
            const current  = foundry.utils.getProperty(this.actor.system, `skills.${skillId}.attrOverride`)?.slice()
                          ?? [...defaults];

            current[which] = el.value;

            if (current[0] === current[1]) {
                ui.notifications.warn(game.i18n.localize("splittermond.warn.sameAttrs") || "Bitte zwei unterschiedliche Attribute wählen.");
                el.value = defaults[which]; // revert
                return;
            }

            await this.actor.update({ [`system.skills.${skillId}.attrOverride`]: current });
            this.render(false); // refresh visible values/tooltips
        });

        super.activateListeners(html);
    }

    // ... rest of the class stays the same ...
}
