import { initializeDisplayPreparation } from "./itemDisplayPreparation";
import {
    FoundryApplication,
    FoundryDragDrop, FoundryHandlebarsMixin,
} from "../../api/Application";
import {foundryApi} from "../../api/foundryApi";
import {splittermond} from "../../config";
import {itemRetriever} from "../../data/EntityRetriever";
import SplittermondItem from "../../item/item";
import {CompendiumPacks} from "../../api/foundryTypes";
import {closestData, ClosestDataMixin} from "../../data/ClosestDataMixin";


type ItemIndexEntity = {
    type: string;
    folder: string;
    img: string;
    name: string;
    uuid: string;
    id: string;
    system: any;
    [key: string]: any;
};

type FilterSkills = { [key: string]: string };

interface BrowserContext {
    spellFilter: { skills: FilterSkills };
    masteryFilter: { skills: FilterSkills };
    weaponFilter: { skills: FilterSkills };
    items: Record<string, ItemIndexEntity[]>;
    [key: string]: any;
}

export default class SplittermondCompendiumBrowser extends ClosestDataMixin(FoundryHandlebarsMixin(FoundryApplication)) {
    static TABS = {
        sheet: {
            tabs: [
                { id: 'spell', group: 'primary', label: 'splittermond.spells' },
                { id: 'mastery', group: 'primary', label: 'splittermond.masteries' },
                { id: 'weapon', group: 'primary', label: 'splittermond.weapons' },
            ],
            initial: "spell"
        }
    }
    static PARTS = {
        tabs:  {
            template: "systems/splittermond/templates/apps/compendium-browser/parts/tabs.hbs",
        },
        "spell": {
            template: "systems/splittermond/templates/apps/compendium-browser/parts/spell.hbs",
        },
        "mastery": {
            template: "systems/splittermond/templates/apps/compendium-browser/parts/mastery.hbs",
        },
        "weapon": {
            template: "systems/splittermond/templates/apps/compendium-browser/parts/weapon.hbs",
        }
    };
    #dragDrop: FoundryDragDrop[];

    allItems: Record<string, ItemIndexEntity[]>;
    skillsFilter: Record<string, any>;
    _produceDisplayableItems: ((...args: any[]) => any) | undefined;

    constructor(options: ConstructorParameters<typeof FoundryApplication>[0] = {}) {
        super({
            tag: "form",
            form: {
                submitOnChange:false,
            },
            classes: ["splittermond", "compendium-browser"],
            window: {
                //width: 600,
                //top: 70,
                //left: 120,
                //height: window.innerHeight - 100,
                resizable: true,
            },
            dragDrop: [{ dragSelector: ".list > ol > li" }],
            id: "compendium-browser",
            title: "Compendium Browser",
            ...options,
        });
        this.#dragDrop = this.#createDragDropHandlers();

        this.allItems = {};
        this.skillsFilter = {};

        this._produceDisplayableItems = undefined;
    }

    private produceDisplayableItems() {
        if (!this._produceDisplayableItems) {
            this._produceDisplayableItems = initializeDisplayPreparation(
                {localize: foundryApi.localize},
                [...splittermond.skillGroups.magic],
                [...splittermond.skillGroups.all]
            );
        }
        return this._produceDisplayableItems;
    };

    #createDragDropHandlers(): FoundryDragDrop[] {
        return (this.options.dragDrop as Record<string,unknown>[]).map((d) => {
            d.permissions = {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this),
            };
            d.callbacks = {
                dragstart: this._onDragStart.bind(this),
                dragover: null,
                drop: null,
            };
            return new FoundryDragDrop(d);
        });
    }

    async _prepareContext(options: any): Promise<BrowserContext> {
        const getDataTimerStart = performance.now();
        const data = await super._prepareContext(options) as BrowserContext;
        data.spellFilter = {
            skills: foundryApi.utils.deepClone(splittermond.spellSkillsOption)
        };

        data.masteryFilter = {
            skills: foundryApi.utils.deepClone(splittermond.masterySkillsOption)
        };

        data.weaponFilter = {
            skills: foundryApi.utils.deepClone(splittermond.fightingSkillOptions)
        };

        delete (data.spellFilter.skills.arcanelore);
        data.spellFilter.skills.none = "splittermond.skillLabel.none";
        data.weaponFilter.skills.none = "splittermond.skillLabel.none";

        const allItems = this.recordCompendiaItemsInCategories(foundryApi.collections.packs )
            .then(record => this.appendWorldItemsToRecord(record, itemRetriever.items))
            .then(this.sortCategories);
        return new Promise(async (resolve, __) => {
            data.items = await allItems;
            console.debug(`Splittermond | Compendium Browser getData took ${performance.now() - getDataTimerStart} ms`);
            resolve(data);
        });
    }

    recordCompendiaItemsInCategories(compendia: CompendiumPacks): Promise<Record<string, ItemIndexEntity[]>> {
        let allItems: Record<string, ItemIndexEntity[]> = {};

        const indices = compendia
            .filter(pack => pack.documentName === "Item")
            .filter(pack => {
                const wellFormedMetadata = "id" in pack.metadata && "label" in pack.metadata
                if (!wellFormedMetadata) {
                    console.warn(`Splittermond | Pack ${pack.metadata.name} does not have well-formed metadata. It will be ignored.`);
                }
                return wellFormedMetadata
            })
            .map(pack => ({
                metadata: { id: pack.metadata.id, label: pack.metadata.label },
                index: pack.getIndex({
                    fields: ["system.availableIn", "system.skill", "system.skillLevel", "system.features",
                        "system.level", "system.spellType", "system.secondaryAttack.skill", "system.damage"]
                })
            }));

        return Promise.all(
            indices.map(
                (compendiumBrowserCompendium) => this.produceDisplayableItems()(
                    compendiumBrowserCompendium.metadata,
                    compendiumBrowserCompendium.index,
                    allItems
                )
            )
        ).then(() => allItems);
    }

    appendWorldItemsToRecord(record: Record<string, ItemIndexEntity[]>, items: Collection<SplittermondItem>): Record<string, ItemIndexEntity[]> {
        items.forEach((item: SplittermondItem) => {
            if (!(item.type in record)) {
                record[item.type] = [];
            }
            record[item.type].push(item);
        });
        return record;
    }

    sortCategories(record: Record<string, ItemIndexEntity[]>): Record<string, ItemIndexEntity[]> {
        Object.keys(record).forEach(k => {
            record[k].sort((a, b) => (a.name < b.name) ? -1 : 1);
        });
        return record;
    }

    async _onRender(context: any, options: any): Promise<void> {
        const html = $(this.element);

        await super._onRender(context, options);
        this.#dragDrop.forEach((d) => d.bind(this.element));

        html.find('.sheet-navigation-item').on('click', (ev: JQuery.ClickEvent) => {
            ev.preventDefault();
            const tab = $(ev.currentTarget).data('tab');
            const group = $(ev.currentTarget).closest('nav').data('group') || 'primary';

            html.find(`.sheet-navigation[data-group="${group}"] .sheet-navigation-item`).removeClass('active');
            $(ev.currentTarget).addClass('active');

            html.find(`section.tab[data-group="${group}"]`).hide();
            html.find(`section.tab[data-group="${group}"][data-tab="${tab}"]`).show();
        });

        this.element.querySelectorAll(".list li")
            .forEach(el =>el.addEventListener('click', async (e) => this.listElementClickHandler(e)));

        this.element.querySelectorAll('[data-tab="spell"] input, [data-tab="spell"] select').forEach(
            el=>el.addEventListener('change', () => {
            this._onSearchFilterSpell(html);
        }));
        this.element.querySelectorAll('[data-tab="mastery"] input, [data-tab="mastery"] select').forEach(
            el => el.addEventListener('change', () => {
            this._onSearchFilterMastery(html);
        }));
        this.element.querySelectorAll('[data-tab="weapon"] input, [data-tab="weapon"] select').forEach(
            el => el.addEventListener('change', () => {
            this._onSearchFilterWeapon(html);
        }));
        this._onSearchFilterWeapon(html); //No clue why this is here.
    }

    private async listElementClickHandler(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        const itemId = closestData(e.currentTarget as HTMLElement/*we know this*/, "item-id");
        if( !itemId) {
            console.warn("Splittermond | No item ID found in clicked compendium browser list element.");
            return;
        }
        const item = await foundryApi.utils.fromUUID(itemId);
        let sheet = item.sheet;
        //@ts-expect-error ui windows will only show ApplicationV1 windows, so its days are numbered.
        sheet = Object.values(ui.windows).find((app: any) => app.id === sheet.id) ?? sheet;
        if (sheet._minimized) return sheet.maximize();
        sheet.render(true);
    }

    _canDragStart(selector:string) {
        //Check if closest data can be replaced by this.
        const itemId = this.element.querySelector(selector)?.closest("[data-item-id]")?.attributes.getNamedItem("data-item-id")!.value;
        return itemId !== undefined;
    }

    _canDragDrop(): boolean {
        return false;
    }

    _onDragStart(event: DragEvent): void {
        const li = event.currentTarget as HTMLElement;
        event.dataTransfer?.setData("text/plain", JSON.stringify({
            type: "Item",
            uuid: li.dataset.itemId
        }));
    }

    _onSearchFilterSpell(html: JQuery<HTMLElement>): void {
        const rgx = new RegExp(this._escape_regex((html.find(`[data-tab="spell"] input[name="search"]`)[0] as HTMLInputElement).value), "i");
        let filterSkill = (html.find(`[data-tab="spell"] select[name="skill"]`)[0] as HTMLSelectElement).value;
        let filterWorldItems = (html.find(`[data-tab="spell"] input[name="show-world-items-spell"]`)[0] as HTMLInputElement).checked;
        let filterSkillLevel = [
            (html.find(`[data-tab="spell"] input#skill-level-spell-0`)[0] as HTMLInputElement).checked,
            (html.find(`[data-tab="spell"] input#skill-level-spell-1`)[0] as HTMLInputElement).checked,
            (html.find(`[data-tab="spell"] input#skill-level-spell-2`)[0] as HTMLInputElement).checked,
            (html.find(`[data-tab="spell"] input#skill-level-spell-3`)[0] as HTMLInputElement).checked,
            (html.find(`[data-tab="spell"] input#skill-level-spell-4`)[0] as HTMLInputElement).checked,
            (html.find(`[data-tab="spell"] input#skill-level-spell-5`)[0] as HTMLInputElement).checked
        ];

        if (filterSkill === "none") {
            filterSkill = "";
        }
        let idx = 0;
        for (let li of (html.find(`[data-tab="spell"] .list > ol`)[0] as HTMLUListElement).children) {
            const name = li.querySelector("label")!.textContent!;
            let availableIn = closestData(li,"available-in") ?? "";
            let skill = closestData(li, "skill");
            let skillLevel = closestData(li,"skill-level");
            let itemId = closestData(li, "item-id") ?? "";
            let displayListItem = rgx.test(name) && (availableIn.includes(filterSkill) || skill === filterSkill);

            if (displayListItem && filterSkillLevel.includes(true)) {
                displayListItem = displayListItem && filterSkillLevel.reduce((acc, element, idx) => {
                    if (element) {
                        return acc || (availableIn.includes(filterSkill + " " + idx) || skillLevel === `${idx}`);
                    }
                    return acc;
                }, false);
            }

            if (!filterWorldItems) {
                displayListItem = displayListItem && itemId.startsWith("Compendium");
            }
            (li as HTMLElement).style.display = displayListItem ? "flex" : "none";

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

    _onSearchFilterMastery(html: JQuery<HTMLElement>): void {
        const rgx = new RegExp(this._escape_regex((html.find(`[data-tab="mastery"] input[name="search"]`)[0] as HTMLInputElement).value), "i");
        let filterSkill = (html.find(`[data-tab="mastery"] select[name="skill"]`)[0] as HTMLSelectElement).value;
        let filterWorldItems = (html.find(`[data-tab="mastery"] input[name="show-world-items-mastery"]`)[0] as HTMLInputElement).checked;
        let filterSkillLevel = [
            (html.find(`[data-tab="mastery"] input#skill-level-mastery-1`)[0] as HTMLInputElement).checked,
            (html.find(`[data-tab="mastery"] input#skill-level-mastery-2`)[0] as HTMLInputElement).checked,
            (html.find(`[data-tab="mastery"] input#skill-level-mastery-3`)[0] as HTMLInputElement).checked,
            (html.find(`[data-tab="mastery"] input#skill-level-mastery-4`)[0] as HTMLInputElement).checked
        ];

        if (filterSkill === "none") {
            filterSkill = "";
        }
        let idx = 0;
        for (let li of (html.find(`[data-tab="mastery"] .list > ol`)[0] as HTMLUListElement).children) {
            const name = li.querySelector("label")!.textContent!;
            let availableIn = (closestData(li, "available-in")??"").split(",").map((s: string) => s.trim());
            let skill = closestData(li, "skill");
            const protoSkillLevel = closestData(li, "level");
            const itemId = closestData(li, "item-id") ?? "";

            const skillLevel = protoSkillLevel ? parseInt(protoSkillLevel) : null;
            let test = rgx.test(name) && (!filterSkill || availableIn.includes(filterSkill) || skill === filterSkill);

            if (test && filterSkillLevel.includes(true)) {
                test = test && filterSkillLevel.reduce((acc, element, idx) => {
                    if (element) {
                        return acc || skillLevel === idx + 1;
                    }
                    return acc;
                }, false);
            }

            if (!filterWorldItems) {
                test = test && itemId.startsWith("Compendium");
            }
            (li as HTMLElement).style.display = test ? "flex" : "none";

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

    _onSearchFilterWeapon(html: JQuery<HTMLElement>): void {
        const rgx = new RegExp(this._escape_regex((html.find(`[data-tab="weapon"] input[name="search"]`)[0] as HTMLInputElement).value), "i");
        let filterSkill = (html.find(`[data-tab="weapon"] select[name="skill"]`)[0] as HTMLSelectElement).value;
        let filterWorldItems = (html.find(`[data-tab="weapon"] input[name="show-world-items-weapon"]`)[0] as HTMLInputElement).checked;

        if (filterSkill === "none") {
            filterSkill = "";
        }
        let idx = 0;
        for (let li of (html.find(`[data-tab="weapon"] .list > ol`)[0] as HTMLUListElement).children) {
            const name = li.querySelector("label")!.textContent!;
            let skill = closestData(li, "skill")
            let secondarySkill = closestData(li, "secondary-skill")
            let features = closestData(li, "features") + " " + closestData(li, "secondary-features");
            let damage = `${closestData(li, "damage")}${closestData(li, "secondary-damage")}`;
            let itemId = closestData(li, "item-id");

            let test = (rgx.test(name + " " + features + " " + damage)) && (skill === filterSkill || secondarySkill === filterSkill || filterSkill === "");

            if (!filterWorldItems) {
                test = test && (itemId?.startsWith("Compendium") ?? false);
            }
            (li as HTMLElement).style.display = test ? "flex" : "none";

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

    get title(): string {
        return "Compendium Browser";
    }

    _escape_regex(pattern: string): string {
        return pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }
}

