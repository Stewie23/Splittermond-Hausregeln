import {foundryApi} from "module/api/foundryApi";
import {settings} from "module/settings";
import {
    ApplicationContextOptions,
    ApplicationRenderContext,
    SplittermondApplication
} from "module/data/SplittermondApplication";
import SplittermondActor from "module/actor/actor";
import {splittermond} from "module/config";
import SplittermondItem from "module/item/item";
import SplittermondSpellItem from "module/item/spell";
import {SplittermondSkill} from "module/config/skillGroups";
import {closestData} from "module/data/ClosestDataMixin";
import {TokenActionBarTemplateData} from "./templateInterface";


let theInstance: TokenActionBar | null = null;
let showActionBarGetter = () => false
let showActionBar = () => true;

settings.registerBoolean("showHotbarDuringActionBar", {
    position: 4,
    scope: "client",
    config: true,
    default: true,
    onChange: () => {
        setTimeout(async () => {
            await theInstance!.update(); //can only be reached after the game is ready, so theInstance is not null
        }, 500);

    }
}).then(accessors => showActionBar = accessors.get)
    .catch(e => console.warn("Splittermond | Error registering setting showHotbarDuringActionBar", e));

settings.registerBoolean("showActionBar", {
    position: 3,
    scope: "client",
    config: true,
    default: true,
    onChange: () => {
        setTimeout(async () => {
            await theInstance!.update(); //can only be reached after the game is ready, so theInstance is not null
        }, 500);

    }
}).then(accessors => showActionBarGetter = accessors.get)
    .catch(e => console.warn("Splittermond | Error registering setting showActionBar", e));

export default class TokenActionBar extends SplittermondApplication {

    private _currentActor: SplittermondActor | null;
    static PARTS = {
        app: {
            template: "systems/splittermond/templates/apps/action-bar.hbs",
        }
    }

    static DEFAULT_OPTIONS = {
        id: "token-action-bar",
        tag: "div",
        classes: ["splittermond", "token-action-bar"],
        window: {
            frame: false,
            popOut: false,
            minimizable: false,
            resizable: false
        }

    }

    constructor() {
        super();
        this._currentActor = null;
    }

    get currentActor(): SplittermondActor | null {
        return this._currentActor;
    }

    async update() {
        setTimeout(async () => {
            if (!showActionBarGetter()) {
                this._currentActor = null;
                await this.render(true);
                $("#hotbar").show(200);
                return;
            }

            let speaker = foundryApi.getSpeaker({});
            this._currentActor = null;
            if (speaker.token) this._currentActor = foundryApi.getToken(speaker.scene, speaker.token)!.actor as SplittermondActor;
            if (!this._currentActor && speaker.actor) this._currentActor = foundryApi.getActor(speaker.actor) as SplittermondActor;

            if (this._currentActor == null) {
                $("#hotbar").parent().show(200);
                if ($("#custom-hotbar").length > 0) {
                    $("#custom-hotbar").attr("style", "display: flex !important");
                }
            } else {
                if (!showActionBar()) {
                    $("#hotbar").parent().hide(200);
                    if ($("#custom-hotbar").length > 0) {
                        $("#custom-hotbar").attr("style", "display: none !important");
                    }
                }

            }
            await this.render(true);
        }, 100);
    }

    async _prepareContext(options: ApplicationContextOptions) {
        const data = await super._prepareContext(options) as ApplicationRenderContext & Partial<TokenActionBarTemplateData>;
        if (!!this._currentActor) {
            const currentActor = this._currentActor;
            data.name = this._currentActor.isToken ? this._currentActor.token.name : this._currentActor.name;
            data.actorId = this._currentActor.id;
            data.img = this._currentActor.isToken ? this._currentActor.token.texture.src : this._currentActor.img;
            data.skills = {
                general: splittermond.skillGroups.general.filter(skillId => ["acrobatics", "athletics", "determination", "stealth", "perception", "endurance"].includes(skillId) ||
                    (parseInt(currentActor.skills[skillId].points) > 0)).map(skillId => currentActor.skills[skillId]),
                magic: splittermond.skillGroups.magic.filter(skillId => ["acrobatics", "athletics", "determination", "stealth", "perception", "endurance"].includes(skillId) ||
                    (parseInt(currentActor.skills[skillId].points) > 0)).map(skillId => currentActor.skills[skillId])
            }

            data.attacks = this._currentActor.attacks
                .map(a => a.toObject())
                .map(a => ({
                    ...a,
                    weaponSpeed: `${a.weaponSpeed}`,
                    range: `${a.range}`,
                }));

            data.weapons = this._currentActor.items.filter(item => ["weapon", "shield"].includes(item.type)).sort((a, b) => (a.sort - b.sort)).map(w => w.toObject());


            data.spells = this._currentActor.spells.filter((spell:SplittermondSpellItem) => spell.skill && spell.skill.id)
                .reduce((result: Partial<Record<SplittermondSkill, {
                label: string;
                skillValue: number;
                spells: any[];
            }>>, item: SplittermondSpellItem) => {
                const skillName = item.skill.id as SplittermondSkill;
                if (!splittermond.skillGroups.all.includes(skillName)) {
                    throw new Error(`${skillName} is not a know skill`)
                }
                if (!result[skillName]) {
                    result[skillName] = {
                        label: `splittermond.skillLabel.${skillName}`,
                        skillValue: item.skill.value,
                        spells: []
                    };
                }
                result[skillName].spells.push(item);
                return result;
            }, {});

            if (Object.keys(data.spells as object/*see above*/).length == 0) {
                data.spells = undefined;
            }

            const preparedItemId = this._currentActor.getFlag("splittermond", "preparedSpell") as string | null
            data.preparedSpell = preparedItemId ? this.getPreparedSpell(preparedItemId) : null;


            data.derivedValues = this._currentActor.derivedValues;
        }

        return data;

    }

    private getPreparedSpell(preparedSpellId: string) {
        const preparedItem = preparedSpellId ? this._currentActor?.items.get(preparedSpellId) : null;
        if (!(preparedItem instanceof SplittermondSpellItem)) {
            throw new Error(`${preparedSpellId} is not a spell item`);
        }
        return {
            castDuration: preparedItem.castDuration,
            costs: preparedItem.castDuration,
            damage: preparedItem.damage,
            difficulty: preparedItem.difficulty,
            effectDuration: preparedItem.difficulty,
            enhancementCosts: preparedItem.enhancementCosts,
            enhancementDescription: preparedItem.enhancementDescription,
            enoughFocus: preparedItem.enoughFocus,
            id: preparedItem.id,
            img: preparedItem.img,
            name: preparedItem.name,
            range: preparedItem.range,
            skill: {label: preparedItem.skill.label, value: preparedItem.skill.value},
            spellTypeList: preparedItem.spellTypeList,
            description: preparedItem.system.description ?? ""
        };
    }

    async _onRender() {
        const html = $(this.element);
        const document = this.element.ownerDocument.documentElement;


        if (showActionBar()) {
            let bottomPosition = Math.min($("#ui-bottom").outerHeight() ?? Number.POSITIVE_INFINITY, $("#hotbar").outerHeight() ?? Number.POSITIVE_INFINITY);
            const bodyHeight = document.ownerDocument.body.offsetHeight;
            if (document.querySelectorAll("#custom-hotbar").length) {
                bottomPosition = Math.max(bodyHeight - $("#custom-hotbar").position().top, bottomPosition);
            }
            (this.element.querySelector(".token-action-bar")! as HTMLElement).style.bottom = `${bottomPosition}px`;
        } else {
            setTimeout(() => {
                let bottomPosition = $("#ui-bottom").outerHeight() ?? "";
                (this.element.querySelector(".token-action-bar")! as HTMLElement).style.bottom = `${bottomPosition}px`;
            }, 200);
        }

        this.element.querySelectorAll(".rollable").forEach(rollable => {
            rollable.addEventListener("click", async (event:Event) => {
                const target = event.currentTarget as HTMLElement;

                const type = closestData(target, 'roll-type');
                if (type === "skill") {
                    const skill = closestData(target, 'skill');
                    this._currentActor?.rollSkill(skill);
                }

                if (type === "attack") {
                    const attackId = closestData(target, 'attack-id');
                    const prepared = closestData(target, 'prepared');
                    if (prepared) {
                        let success = await this._currentActor?.rollAttack(attackId);
                        if (success) this._currentActor?.setFlag("splittermond", "preparedAttack", {})
                        return;
                    }
                    const attack = this._currentActor?.attacks.find(attack => attack.toObject().id === attackId);
                    if (!attack) {
                        console.debug(`Splittermond | Attack of id ${attackId} not found on actor`);
                        return;
                    }
                    this._currentActor?.addTicks(attack.weaponSpeed, `${foundryApi.localize("splittermond.attack")}: ${attack.name}`);
                    this._currentActor?.setFlag("splittermond", "preparedAttack", attackId);
                }
                if (type === "spell") {
                    const itemId = closestData(target, 'item-id');
                    let success = await this._currentActor?.rollSpell(itemId);
                    if (success) {
                        this._currentActor?.setFlag("splittermond", "preparedSpell", null);
                    }

                }

                if (type === "activeDefense") {
                    const defenseType = closestData(target, 'defense-type') ?? undefined;
                    if (isDefenseType(defenseType)) {
                        this._currentActor?.activeDefenseDialog(defenseType);
                    } else {
                        console.debug("Splittermond | Invalid defense type", defenseType);
                        this._currentActor?.activeDefenseDialog(undefined);
                    }
                }
            });
        });

        html.find('.toggle-equipped').click(event => {
            const itemId = closestData(event.currentTarget, 'item-id') ?? "";
            const item = this._currentActor?.items.get(itemId);
            if (!item || !("equipped" in item.system)) {
                console.debug("Splittermond | Invalid item for toggle equipped", item?.uuid);
                return;
            }
            item.update({"system.equipped": !item.system.equipped});
        });

        html.find('.prepare-spell').click(event => {
            const itemId = closestData(event.currentTarget, 'spell-id') ?? "";
            const spell = this._currentActor?.items.get(itemId);
            if (!spell || !(spell instanceof SplittermondSpellItem)) {
                console.debug("Splittermond | Invalid spell", spell?.uuid);
                return;
            }
            this._currentActor?.addTicks(spell.castDuration, `${foundryApi.localize("splittermond.castDuration")}: ${spell.name}`);
            this._currentActor?.setFlag("splittermond", "preparedSpell", itemId);
        });

        this.element.querySelectorAll('[data-action="open-sheet"]').forEach(element =>
            element.addEventListener("click", async () => {
                this._currentActor?.sheet.render(true);
            }));
    }

}

function isDefenseType(defenseType: string | undefined): defenseType is "vtd" | "kw" | "gw" | "defense" {
    return defenseType === undefined || ["vtd", "kw", "gw", "defense"].includes(defenseType);
}

foundryApi.hooks.on("ready", () => {
    if (getGame().splittermond === undefined) {
        getGame().splittermond = {};
    }
    getGame().splittermond.tokenActionBar = new TokenActionBar();
    theInstance = getGame().splittermond.tokenActionBar;
    theInstance?.update();

    type Controlled = unknown;
    foundryApi.hooks.on("controlToken", (__: TokenDocument, ___: Controlled) => {
        theInstance?.update()
    });

    type Updates = unknown
    foundryApi.hooks.on("updateActor", (actor: SplittermondActor, __: Updates) => {
        if (actor.id === theInstance?.currentActor?.id)
            theInstance?.update();
    });

    type Scene = unknown;
    foundryApi.hooks.on("updateToken", (__: Scene, token: TokenDocument, ___: Updates) => {
        if (token._id == theInstance?.currentActor?.id)
            theInstance?.update();
    });

    foundryApi.hooks.on("updateItem", (source, __: SplittermondItem) => {
        if (source?.parent?.id == theInstance?.currentActor?.id)
            theInstance?.update();
    });

    foundryApi.hooks.on("createItem", (source, __: SplittermondItem) => {
        if (source?.parent?.id === theInstance?.currentActor?.id)
            theInstance?.update();
    });

    foundryApi.hooks.on("deleteItem", (source, __: SplittermondItem) => {
        if (source?.parent?.id == theInstance?.currentActor?.id)
            theInstance?.update();
    });
});

function getGame():Record<string,any>{
    //@ts-expect-error
    return game;
}