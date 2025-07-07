import "../../../foundryMocks.js";
import sinon, {SinonSandbox} from "sinon";
import {afterEach, beforeEach, describe, it} from "mocha";
import {expect} from 'chai';
import {createHtml} from "../../../../handlebarHarness";
import SplittermondCompendiumBrowser from "../../../../../module/apps/compendiumBrowser/compendium-browser";
import {JSDOM} from "jsdom";

describe('compendium-browser filters spells', async () => {
    let sandbox: SinonSandbox;
    beforeEach(() => { sandbox = sinon.createSandbox(); });
    afterEach(() => { sandbox.restore(); });
    const probe: any = {
        spellFilter: {
            skills: {
                lightmagic: "splittermond.skilllabel.lightmagic",
                shadowmagic: "splittermond.skilllabel.shadowmagic",
                none: "splittermond.skilllabel.none"
            }
        },
        masteryFilter: { skill: { none: "splittermond.skilllabel.none" } },
        weaponFilter: { skill: { none: "splittermond.skilllabel.none" } },
        items: {
            mastery: [],
            weapon: [],
            spell: [
                {
                    availableInList: ["splittermond.skilllabel.lightmagic 1", "splittermond.skilllabel.shadowmagic 3"],
                    spellTypeList: [],
                    sort: 5300000,
                    _id: "1",
                    type: "spell",
                    uuid: "Compendium.world.zauber.Item.1",
                    name: "Licht",
                    system: {
                        availableIn: "lightmagic 1, shadowmagic 3",
                        skill: "lightmagic",
                        skillLevel: 0
                    },
                    compendium: {
                        metadata: {
                            id: "world.zauber",
                            label: "Zauber",
                        }
                    },
                },
                {
                    availableInList: ["splittermond.skilllabel.shadowmagic 3"],
                    spellTypeList: [],
                    name: "Dunkelheit",
                    _id: "2",
                    type: "spell",
                    uuid: "Compendium.world.zauber.Item.2",
                    compendium: {
                        metadata: {
                            id: "world.zauber",
                            label: "Zauber",
                        }
                    },
                    system: {
                        availableIn: "",
                        skill: "shadowmagic",
                        skillLevel: 3
                    }
                },
            ]
        }
    };

    it("should filter all spells if checkbox filter that no spell matches is activated", () => {
        const objectUnderTest = new SplittermondCompendiumBrowser();
        const domUnderTest = new JSDOM(createHtml("./templates/apps/compendium-browser.hbs", probe));
        // @ts-expect-error element should be not writable, but we need to set it for the test
        objectUnderTest.element = domUnderTest.window.document.documentElement;
        (objectUnderTest.element.querySelector(`[data-tab="spell"] input#skill-level-spell-0`) as HTMLInputElement).checked = true;
        objectUnderTest._onRender({},{});
        (objectUnderTest.element.querySelectorAll('[data-tab="spell"] li.list-item .draggable').forEach(
            (element, index) => {
                expect(element.getAttribute("style"), `List item at index ${index} with inner html: ${element.innerHTML}`).to.equal("display: none;");
            }
        ));
    });
});

