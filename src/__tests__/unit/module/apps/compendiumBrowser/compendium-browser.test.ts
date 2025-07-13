import "../../../foundryMocks.js";
import sinon, {SinonSandbox} from "sinon";
import {afterEach, beforeEach, describe, it} from "mocha";
import {expect} from 'chai';
import {createHtml} from "../../../../handlebarHarness";
import SplittermondCompendiumBrowser from "../../../../../module/apps/compendiumBrowser/compendium-browser";
import {JSDOM} from "jsdom";
import {SplittermondMagicSkill, SplittermondSkill} from "../../../../../module/config/skillGroups";
import SplittermondSpellItem from "../../../../../module/item/spell";
import {SpellDataModel} from "../../../../../module/item/dataModel/SpellDataModel";

describe('compendium-browser filters spells', async () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    afterEach(() => {
        sandbox.restore();
    });

    describe(`compendium-browser spell tab`, () => {
        it("should only display items of the selected skill", async () => {
            const display1 = addCompendiumSpell("lightmagic", 1);
            const display2 = addCompendiumSpell("lightmagic", 1, true);
            const notDisplay1 = addCompendiumSpell("shadowmagic", 1);
            const notDisplay2 = addCompendiumSpell("shadowmagic", 1, true);
            const objectUnderTest = await setupCompendiumBrowser("./templates/apps/compendium-browser/parts/spell.hbs",
                    probe => {
                    return probe.items.spell.push(display1, display2, notDisplay1, notDisplay2);
                });

            objectUnderTest.setSkill("lightmagic", "spell");

            objectUnderTest.element.querySelectorAll("li.list-item").forEach((el) => {
                const li = el as HTMLOListElement;
                const liItemName = li.querySelector("label")?.textContent ?? "No item found"
                const message = `List item  ${liItemName} has incorrect display style`;
                if ([display1.name, display2.name].includes(liItemName)) {
                    expect(li.style.display, message).to.equal("flex");
                } else if ([notDisplay1.name, notDisplay2.name].includes(liItemName)) {
                    expect(li.style.display, message).to.equal("none");
                } else {
                    expect.fail(`List item ${liItemName} is not expected to be in the list`);
                }
            });
        });

        it("should only display items that have or are available in the selected Level", async () => {
            const display1 = addCompendiumSpell("lightmagic", 1);
            const display2 = addCompendiumSpell("lightmagic", 1, true);
            const notDisplay1 = addCompendiumSpell("shadowmagic", 2);
            const notDisplay2 = addCompendiumSpell("shadowmagic", 2, true);
            const objectUnderTest = await setupCompendiumBrowser("./templates/apps/compendium-browser/parts/spell.hbs",
                (probe => {
                    return probe.items.spell.push(display1, display2, notDisplay1, notDisplay2);
                }));

            objectUnderTest.setLevel(1, "spell")

            objectUnderTest.element.querySelectorAll("li.list-item").forEach((el) => {
                const li = el as HTMLOListElement;
                const liItemName = li.querySelector("label")?.textContent ?? "No item found"
                const message = `List item  ${liItemName} has incorrect display style`;
                if ([display1.name, display2.name].includes(liItemName)) {
                    expect(li.style.display, message).to.equal("flex");
                } else if ([notDisplay1.name, notDisplay2.name].includes(liItemName)) {
                    expect(li.style.display, message).to.equal("none");
                } else {
                    expect.fail(`List item ${liItemName} is not expected to be in the list`);
                }
            });
        });

        it("should not display world spells when the filter is set to off", async () => {

            const notDisplayed= addWorldSpell("lightmagic", 1);
            const objectUnderTest = await setupCompendiumBrowser("./templates/apps/compendium-browser/parts/spell.hbs",
                probe => {
                    return probe.items.spell.push(notDisplayed);
                });

            objectUnderTest.setWorldItemFilter(false, "spell");

            objectUnderTest.getListItems().forEach((el) => {
                const li = el as HTMLOListElement;
                const liItemName = li.querySelector("label")?.textContent ?? "No item found"
                expect(li.style.display, `List item ${liItemName} should not be displayed`).to.equal("none");
            });
        });
    });

    function addWorldSpell(skill: SplittermondMagicSkill, level: number, availableOnly: boolean = false) {
        const spellId = id.next().value;
        const spell = sandbox.createStubInstance(SplittermondSpellItem);
        spell.system = sandbox.createStubInstance(SpellDataModel)
        sandbox.stub(spell,"id").get(()=> spellId);
        sandbox.stub(spell, "uuid").get(() => `Item.${spellId}`);
        if (availableOnly) {
            spell.system.availableIn = `${skill} ${level}`;
        }else {
            spell.system.skill = skill;
            spell.system.skillLevel = level;
        }
        return spell;
    }

});

// --- Additional tests for masteries and weapons ---

describe('compendium-browser filters masteries', () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    afterEach(() => {
        sandbox.restore();
    });

    function addCompendiumMastery(skill: string, level: number, name?: string) {
        const myId = id.next().value;
        return {
            name: name ?? "Compendium Mastery " + myId,
            _id: `${myId}`,
            uuid: `Compendium.world.masteries.Item.${myId}`,
            type: "mastery",
            system: {
                availableIn: `${skill} ${level}`,
                skill,
                level
            },
            availableInList: [{ label: `splittermond.skilllabel.${skill} ${level}` }]
        };
    }

    it("should filter masteries by name", async () => {
        const mastery1 = addCompendiumMastery("melee", 1, "Sword Mastery");
        const mastery2 = addCompendiumMastery("ranged", 2, "Bow Mastery");
        const objectUnderTest = await setupCompendiumBrowser(
            "./templates/apps/compendium-browser/parts/mastery.hbs",
            probe => probe.items.mastery.push(mastery1, mastery2)
        );

        // Set name filter to "Sword"
        const input = objectUnderTest.element.querySelector('[data-tab="mastery"] input[name="search"]') as HTMLInputElement;
        input.value = "Sword";
        input.dispatchEvent(new objectUnderTest.dom.window.Event("input", { bubbles: true }));
        objectUnderTest.element.querySelectorAll('[data-tab="mastery"] input, [data-tab="mastery"] select').forEach(
            el => el.dispatchEvent(new objectUnderTest.dom.window.Event("change", { bubbles: true }))
        );

        const visible = Array.from(objectUnderTest.element.querySelectorAll('[data-tab="mastery"] li.list-item'))
            .filter(li => (li as HTMLElement).style.display !== "none")
            .map(li => li.querySelector("label")?.textContent);

        expect(visible).to.include("Sword Mastery");
        expect(visible).to.not.include("Bow Mastery");
    });

    it("should filter masteries by skill and level in combination", async () => {
        const mastery1 = addCompendiumMastery("melee", 1, "Sword Mastery");
        const mastery2 = addCompendiumMastery("melee", 2, "Axe Mastery");
        const mastery3 = addCompendiumMastery("ranged", 1, "Bow Mastery");
        const objectUnderTest = await setupCompendiumBrowser(
            "./templates/apps/compendium-browser/parts/mastery.hbs",
            probe => probe.items.mastery.push(mastery1, mastery2, mastery3)
        );

        // Use TestCompendiumBrowser methods for setting filters
        objectUnderTest.setSkill("melee", "mastery");
        objectUnderTest.setLevel(2, "mastery");

        const visible = Array.from(objectUnderTest.element.querySelectorAll('[data-tab="mastery"] li.list-item'))
            .filter(li => (li as HTMLElement).style.display !== "none")
            .map(li => li.querySelector("label")?.textContent);

        expect(visible).to.include("Axe Mastery");
        expect(visible).to.not.include("Sword Mastery");
        expect(visible).to.not.include("Bow Mastery");
    });
});

describe('compendium-browser filters weapons', () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    afterEach(() => {
        sandbox.restore();
    });

    function addCompendiumWeapon(skill: string, name: string, features: string = "", damage: string = "") {
        const myId = id.next().value;
        return {
            name,
            _id: `${myId}`,
            uuid: `Compendium.world.weapons.Item.${myId}`,
            type: "weapon",
            system: {
                skill,
                features: { internalFeatureList: features },
                damage: { stringInput: damage },
                secondaryAttack: {
                    skill: "none",
                    features: { internalFeatureList: "" },
                    damage: { stringInput: "" }
                }
            },
            featuresList: features ? features.split(",") : [],
            hasSecondaryAttack: false,
            compendium: {
                metadata: {
                    id: "world.weapons",
                    label: "Weapons",
                }
            }
        };
    }

    it("should filter weapons by name", async () => {
        const weapon1 = addCompendiumWeapon("melee", "Longsword", "sharp", "1W6");
        const weapon2 = addCompendiumWeapon("ranged", "Shortbow", "light", "1W6");
        const objectUnderTest = await setupCompendiumBrowser(
            "./templates/apps/compendium-browser/parts/weapon.hbs",
            probe => probe.items.weapon.push(weapon1, weapon2)
        );

        // Set name filter to "Long"
        const input = objectUnderTest.element.querySelector('[data-tab="weapon"] input[name="search"]') as HTMLInputElement;
        input.value = "Long";
        input.dispatchEvent(new objectUnderTest.dom.window.Event("input", { bubbles: true }));
        objectUnderTest.element.querySelectorAll('[data-tab="weapon"] input, [data-tab="weapon"] select').forEach(
            el => el.dispatchEvent(new objectUnderTest.dom.window.Event("change", { bubbles: true }))
        );

        const visible = Array.from(objectUnderTest.element.querySelectorAll('[data-tab="weapon"] li.list-item'))
            .filter(li => (li as HTMLElement).style.display !== "none")
            .map(li => li.querySelector("label")?.textContent);

        expect(visible).to.include("Longsword");
        expect(visible).to.not.include("Shortbow");
    });

    it("should filter weapons by skill and name in combination", async () => {
        const weapon1 = addCompendiumWeapon("melee", "Longsword", "sharp", "1W6");
        const weapon2 = addCompendiumWeapon("melee", "Axe", "heavy", "1W8");
        const weapon3 = addCompendiumWeapon("ranged", "Shortbow", "light", "1W6");
        const objectUnderTest = await setupCompendiumBrowser(
            "./templates/apps/compendium-browser/parts/weapon.hbs",
            probe => probe.items.weapon.push(weapon1, weapon2, weapon3)
        );

        // Use TestCompendiumBrowser methods for setting filters
        objectUnderTest.setSkill("melee", "weapon");
        const input = objectUnderTest.element.querySelector('[data-tab="weapon"] input[name="search"]') as HTMLInputElement;
        input.value = "Axe";
        input.dispatchEvent(new objectUnderTest.dom.window.Event("input", { bubbles: true }));
        objectUnderTest.element.querySelectorAll('[data-tab="weapon"] input, [data-tab="weapon"] select').forEach(
            el => el.dispatchEvent(new objectUnderTest.dom.window.Event("change", { bubbles: true }))
        );

        const visible = Array.from(objectUnderTest.element.querySelectorAll('[data-tab="weapon"] li.list-item'))
            .filter(li => (li as HTMLElement).style.display !== "none")
            .map(li => li.querySelector("label")?.textContent);

        expect(visible).to.include("Axe");
        expect(visible).to.not.include("Longsword");
        expect(visible).to.not.include("Shortbow");
    });
});

class TestCompendiumBrowser extends SplittermondCompendiumBrowser {
    private dom: JSDOM;

    constructor(dom: JSDOM) {
        super();
        // @ts-expect-error element should be not writable, but we need to set it for the test
        this.element = dom.window.document.documentElement;
        this.dom = dom

    }

    setSkill(skill: SplittermondSkill, tab: string) {
        const input = this.element.querySelector(`[data-tab="${tab}"] select`) as HTMLSelectElement;
        input.value = skill;
        input.dispatchEvent(new this.dom.window.Event("change", {bubbles: true}));
    }

    setLevel(level: number, tab: string) {
        let input = this.element.querySelector(`[data-tab="${tab}"] .compendium-item-filters input[type=checkbox][value="${level}"]`) as HTMLInputElement;
        input.checked = true;
        input.dispatchEvent(new this.dom.window.Event("change", {bubbles: true}));
    }

    setWorldItemFilter(value: boolean, tab: string) {
        let input = this.element.querySelector(`[data-tab="${tab}"] .filter input[type=checkbox][name=show-world-items]`) as HTMLInputElement;
        input.checked = value;
        input.dispatchEvent(new this.dom.window.Event("change", {bubbles: true}));

    }

    getListItems() {
        return this.element.querySelectorAll("li.list-item");
    }
}

function getProbe() {
    return {
        spellFilter: {
            skills: {
                lightmagic: "splittermond.skilllabel.lightmagic",
                shadowmagic: "splittermond.skilllabel.shadowmagic",
                none: "splittermond.skilllabel.none"
            }
        },
        masteryFilter: {
            skill: {
                lightmagic: "splittermond.skilllabel.lightmagic",
                shadowmagic: "splittermond.skilllabel.shadowmagic",
                melee: "splittermond.skilllabel.melee",
                ranged: "splittermond.skilllabel.ranged",
                none: "splittermond.skilllabel.none"
            }
        },
        weaponFilter: {
            skill: {
                melee: "splittermond.skilllabel.melee",
                ranged: "splittermond.skilllabel.ranged",
                none: "splittermond.skilllabel.none"
            }
        },
        items: {
            mastery: [],
            weapon: [],
            spell: []
        }
    }
}

const id = function* getNewId() {
    let id = 1;
    while (true) {
        yield id++;
    }
}()

function addCompendiumSpell(skill: SplittermondMagicSkill, level: number, availableOnly: boolean = false) {
    const myId = id.next().value;
    return {
        availableInList: availableOnly ? [`splittermond.skilllabel.${skill} ${level}`] : [],
        spellTypeList: [],
        name: "Compendium Spell " + myId,
        _id: `${myId}`,
        id() {
            return `${myId}`;
        },
        type: "spell",
        uuid: `Compendium.world.zauber.Item.${myId}`,
        compendium: {
            metadata: {
                id: "world.zauber",
                label: "Zauber",
            }
        },
        system: {
            availableIn: `${skill} ${level}`,
            skill: availableOnly ? "arcanelore" : skill,
            skillLevel: availableOnly ? "0" : level
        }
    }
}