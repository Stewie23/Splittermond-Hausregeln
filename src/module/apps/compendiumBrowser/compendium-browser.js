import {initializeDisplayPreparation} from "./itemDisplayPreparation.js";
import {foundryApi} from "../../api/foundryApi";
import {FoundryApplication, HandlebarsMixin} from "../../api/Application.js";

/**
 * @returns {typeof indexSearchParameters};
 */
export default class SplittermondCompendiumBrowser extends HandlebarsMixin(FoundryApplication) {
    static PARTS = {
        form: {
            template: "systems/splittermond/templates/apps/compendium-browser.hbs",
        }
    }
    #dragDrop;

    constructor(options = {}) {
        super({
            classes: ["splittermond", "compendium-browser"],
            width: 600,
            top: 70,
            left: 120,
            height: window.innerHeight - 100,
            resizable: true,
            dragDrop: [{dragSelector: ".list > ol > li"}],
            id: "compendium-browser",
            title: "Compendium Browser",
            ...options,
        });
        this.#dragDrop = this.#createDragDropHandlers();

        /** @type {object} */
        this.allItems = {};
        this.skillsFilter = {};

        this._produceDisplayableItems = undefined;
        this.produceDisplayableItems = () => {
            //lazy initialize property, because this class is instantiated at startup and the translations are not loaded at that point
            if (!this._produceDisplayableItems) {
                this._produceDisplayableItems = initializeDisplayPreparation(
                    game.i18n, CONFIG.splittermond.skillGroups.magic, CONFIG.splittermond.skillGroups.all);
            }
            return this._produceDisplayableItems;
        };
    }

    #createDragDropHandlers() {
        return this.options.dragDrop.map((d) => {
            d.permissions = {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this),
            };
            d.callbacks = {
                dragstart: this._onDragStart.bind(this),
                dragover: null,
                drop: null,
            };
            return new DragDrop(d);
        });
    }



    async _prepareContext(options) {
        const getDataTimerStart = performance.now();
        const data = await super._prepareContext(options);
        data.spellFilter = {
            skills: deepClone(CONFIG.splittermond.spellSkillsOption)
        };

        data.masteryFilter = {
            skills: deepClone(CONFIG.splittermond.masterySkillsOption)
        };

        data.weaponFilter = {
            skills: deepClone(CONFIG.splittermond.fightingSkillOptions)
        };

        //arcanelore may be a spell option, when concerning scrolls, but it is not an innate spell category
        delete (data.spellFilter.skills.arcanelore);
        //for some reason, the mastery filter already has a none option in the config.
        data.spellFilter.skills.none = "splittermond.skillLabel.none";
        data.weaponFilter.skills.none = "splittermond.skillLabel.none";

        const allItems = this.recordCompendiaItemsInCategories(game.packs)
            .then(record => this.appendWorldItemsToRecord(record, game.items))
            .then(this.sortCategories);
        return new Promise(async (resolve, __) => {
            data.items = await allItems;
            console.debug(`Splittermond|Compendium Browser  getData took ${performance.now() - getDataTimerStart} ms`);
            resolve(data);
        });
    }

    /**
     * @typedef {{metadata: CompendiumMetadata, index: Promise<ItemIndexEntity[]>, documentName:string}} CompendiumBrowserCompendiumType
     * @typedef {Map<string,CompendiumBrowserCompendiumType> & {filter: (CompendiumBrowserCompendiumType)=>boolean}} CompendiumBrowserCompendiumPacks
     * @param {CompendiumBrowserCompendiumPacks} compendia
     * @returns {Promise<Record<string,ItemIndexEntity[]>>} the mutated record
     */
    recordCompendiaItemsInCategories(compendia) {
        let allItems = {};

        const indices = compendia
            .filter(pack => pack.documentName === "Item")
            .map(pack => ({
                    metadata: {id: pack.metadata.id, label: pack.metadata.label},
                    index: pack.getIndex({
                        fields: ["system.availableIn", "system.skill", "system.skillLevel", "system.features",
                            "system.level", "system.spellType", "system.secondaryAttack.skill", "system.damage"]
                    })
                })
            );

        return Promise.all(
            indices.map(
                /** @param {CompendiumBrowserCompendiumType} compendiumBrowserCompendium*/
                (compendiumBrowserCompendium) => this.produceDisplayableItems()(
                    compendiumBrowserCompendium.metadata,
                    compendiumBrowserCompendium.index,
                    allItems
                )
            )
        ).then(() => allItems);
    }

    /**
     * @param {Record<string, ItemIndexEntity[]>}record
     * @param items
     * @returns {Record<string, ItemIndexEntity[]>} the mutated record
     */
    appendWorldItemsToRecord(record, items) {
        items.forEach((item, idx) => {
            if (!(item.type in record)) {
                record[item.type] = [];
            }
            record[item.type].push(item);
        });
        return record;
    }

    /**
     * @param {Record<string, ItemIndexEntity[]>} record
     * @returns {Record<string, ItemIndexEntity[]>}
     */
    sortCategories(record) {
        Object.keys(record).forEach(k => {
            record[k].sort((a, b) => (a.name < b.name) ? -1 : 1);
        });
        return record;
    }

    _onRender(context, options) {
        const html = $(this.element)

        super._onRender(context, options);
        this.#dragDrop.forEach((d) => d.bind(this.element));

        // Tab switching logic for ApplicationV2
        html.find('.sheet-navigation-item').on('click', ev => {
            ev.preventDefault();
            const tab = $(ev.currentTarget).data('tab');
            const group = $(ev.currentTarget).closest('nav').data('group') || 'primary';

            // Remove active from all nav items in group
            html.find(`.sheet-navigation[data-group="${group}"] .sheet-navigation-item`).removeClass('active');
            // Add active to clicked nav item
            $(ev.currentTarget).addClass('active');

            // Hide all tab sections in group
            html.find(`section.tab[data-group="${group}"]`).hide();
            // Show the selected tab
            html.find(`section.tab[data-group="${group}"][data-tab="${tab}"]`).show();
        });

        // Show only the initial tab (spell) on first render
        html.find('.list li').click(async ev => {
            let itemId = $(ev.currentTarget).closestData('item-id');
            let item = await fromUuid(itemId);
            let sheet = item.sheet;
            sheet = Object.values(ui.windows).find(app => app.id === sheet.id) ?? sheet;
            if (sheet._minimized) return sheet.maximize();
            sheet.render(true);


        });

        html.on("change", '[data-tab="spell"] input, [data-tab="spell"] select', ev => {
            this._onSearchFilterSpell(html);
        });
        this._onSearchFilterSpell(html);

        html.on("change", '[data-tab="mastery"] input, [data-tab="mastery"] select', ev => {
            this._onSearchFilterMastery(html);
        });
        this._onSearchFilterMastery(html);

        html.on("change", '[data-tab="weapon"] input, [data-tab="weapon"] select', ev => {
            this._onSearchFilterWeapon(html)
        });
        this._onSearchFilterWeapon(html);

    }

    /** @override */

    _canDragStart(selector) {
        const itemId = $(selector).closestData('item-id');

        return itemId !== undefined;
    }


    /* -------------------------------------------- */

    /** @override */
    _canDragDrop(selector) {
        return false;
    }

    /* -------------------------------------------- */

    /** @override */
    _onDragStart(event) {

        // Get the Compendium pack
        const li = event.currentTarget;
        event.dataTransfer.setData("text/plain", JSON.stringify({
            type: "Item",
            uuid: li.dataset.itemId
        }));

    }


    /** @override */
    _onSearchFilterSpell(html) {
        const rgx = new RegExp(this._escape_regex(html.find(`[data-tab="spell"] input[name="search"]`)[0].value), "i");
        let filterSkill = html.find(`[data-tab="spell"] select[name="skill"]`)[0].value;
        let filterWorldItems = html.find(`[data-tab="spell"] input[name="show-world-items-spell"]`)[0].checked;
        let filterSkillLevel = [
            html.find(`[data-tab="spell"] input#skill-level-spell-0`)[0].checked,
            html.find(`[data-tab="spell"] input#skill-level-spell-1`)[0].checked,
            html.find(`[data-tab="spell"] input#skill-level-spell-2`)[0].checked,
            html.find(`[data-tab="spell"] input#skill-level-spell-3`)[0].checked,
            html.find(`[data-tab="spell"] input#skill-level-spell-4`)[0].checked,
            html.find(`[data-tab="spell"] input#skill-level-spell-5`)[0].checked
        ];

        //let filterSkillLevel = html.find(`[data-tab="spell"] select[name="skill"]`)[0].value;
        if (filterSkill === "none") {
            filterSkill = "";
        }
        let idx = 0;
        for (let li of html.find(`[data-tab="spell"] .list > ol`)[0].children) {
            const name = li.querySelector("label").textContent;
            let availableIn = $(li).closestData("available-in");
            let skill = $(li).closestData("skill");
            let skillLevel = $(li).closestData("skill-level");
            let itemId = $(li).closestData("item-id");
            let displayListItem = rgx.test(name) && (availableIn.includes(filterSkill) || skill === filterSkill);

            if (displayListItem && filterSkillLevel.includes(true)) {
                displayListItem = displayListItem && filterSkillLevel.reduce((acc, element, idx) => {
                    if (element) {
                        return acc || (availableIn.includes(filterSkill + " " + idx) || skillLevel === idx);
                    }
                    return acc;
                }, false);
            }

            if (!filterWorldItems) {
                displayListItem = displayListItem && itemId.startsWith("Compendium");
            }
            li.style.display = displayListItem ? "flex" : "none";

            if (displayListItem) {
                idx++;
                if (idx % 2) {
                    $(li).addClass("odd");
                    $(li).removeClass("even");
                } else {
                    $(li).addClass("even");
                    $(li).removeClass("odd");
                }
            }

        }
    }

    _onSearchFilterMastery(html) {
        const rgx = new RegExp(this._escape_regex(html.find(`[data-tab="mastery"] input[name="search"]`)[0].value), "i");
        let filterSkill = html.find(`[data-tab="mastery"] select[name="skill"]`)[0].value;
        let filterWorldItems = html.find(`[data-tab="mastery"] input[name="show-world-items-mastery"]`)[0].checked;
        let filterSkillLevel = [
            html.find(`[data-tab="mastery"] input#skill-level-mastery-1`)[0].checked,
            html.find(`[data-tab="mastery"] input#skill-level-mastery-2`)[0].checked,
            html.find(`[data-tab="mastery"] input#skill-level-mastery-3`)[0].checked,
            html.find(`[data-tab="mastery"] input#skill-level-mastery-4`)[0].checked
        ];

        //let filterSkillLevel = html.find(`[data-tab="spell"] select[name="skill"]`)[0].value;
        if (filterSkill === "none") {
            filterSkill = "";
        }
        let idx = 0;
        for (let li of html.find(`[data-tab="mastery"] .list > ol`)[0].children) {
            const name = li.querySelector("label").textContent;
            let availableIn = $(li).closestData("available-in").split(",").map(s => s.trim());
            let skill = $(li).closestData("skill");
            let skillLevel = $(li).closestData("level");
            let itemId = $(li).closestData("item-id");

            let test = rgx.test(name) && (!filterSkill || availableIn.includes(filterSkill) || skill === filterSkill);

            if (test && filterSkillLevel.includes(true)) {
                test = test && filterSkillLevel.reduce((acc, element, idx) => {
                    if (element) {
                        return acc || skillLevel == idx + 1;
                    }
                    return acc;
                }, false);
            }

            if (!filterWorldItems) {
                test = test && itemId.startsWith("Compendium");
            }
            li.style.display = test ? "flex" : "none";

            if (test) {
                idx++;
                if (idx % 2) {
                    $(li).addClass("odd");
                    $(li).removeClass("even");
                } else {
                    $(li).addClass("even");
                    $(li).removeClass("odd");
                }
            }

        }
    }

    _onSearchFilterWeapon(html) {
        const rgx = new RegExp(this._escape_regex(html.find(`[data-tab="weapon"] input[name="search"]`)[0].value), "i");
        let filterSkill = html.find(`[data-tab="weapon"] select[name="skill"]`)[0].value;
        let filterWorldItems = html.find(`[data-tab="weapon"] input[name="show-world-items-weapon"]`)[0].checked;

        //let filterSkillLevel = html.find(`[data-tab="spell"] select[name="skill"]`)[0].value;
        if (filterSkill === "none") {
            filterSkill = "";
        }
        let idx = 0;
        for (let li of html.find(`[data-tab="weapon"] .list > ol`)[0].children) {
            const name = li.querySelector("label").textContent;
            let skill = $(li).closestData("skill");
            let secondarySkill = $(li).closestData("secondary-skill");
            let features = $(li).closestData("features") + " " + $(li).closestData("secondary-features");
            let damage = $(li).closestData("damage") + $(li).closestData("secondary-damage");
            let itemId = $(li).closestData("item-id");

            let test = (rgx.test(name + " " + features + " " + damage)) && (skill === filterSkill || secondarySkill === filterSkill || filterSkill === "");

            if (!filterWorldItems) {
                test = test && itemId.startsWith("Compendium");
            }
            li.style.display = test ? "flex" : "none";

            if (test) {
                idx++;
                if (idx % 2) {
                    $(li).addClass("odd");
                    $(li).removeClass("even");
                } else {
                    $(li).addClass("even");
                    $(li).removeClass("odd");
                }
            }

        }
    }

    get title() {
        return "Compendium Browser";
    }

    /**
     * A copy of foundry's escapeRegExp. For functitons of this complexity I prefer copying over relying on somebody
     * sneakily mixing in things into global objects
     * @private
     * @param {string} pattern
     */
    _escape_regex(pattern) {
        return pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }


}