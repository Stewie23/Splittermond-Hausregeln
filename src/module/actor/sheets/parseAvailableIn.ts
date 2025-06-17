import {foundryApi} from "../../api/foundryApi";

const defaultLevel = 0;
type SkillOption = { skill: string, level: number };
/**
 * Parses a normalized availableIn string into an array of { skill, level } objects.
 * @param availableIn e.g. "athletics 3, swords 1"
 * @param allowedSkills Array of valid skill ids
 */
export function parseAvailableIn(availableIn: string, allowedSkills: string[]): SkillOption[]{
    if (!availableIn){
        return []
    }
    return availableIn
        .split(",")
        .map(entry => {
        const parts = entry.trim().split(" ");
        const skill = parts[0];
        const protoLevel = parseInt(parts[1]);
        const level = isNaN(protoLevel) ? defaultLevel : protoLevel;
        if (!allowedSkills.includes(skill)){
            return null
        }
        return { skill, level };
    }).filter(option => option !== null);
}

/**
 * Prompts the user to select a skill/level from parsed options, or falls back to all allowed skills.
 * @param parsed Array of { skill, level }
 * @param allowedSkills All valid skill ids
 * @param dialogTitle Title for the dialog
 * @param fallbackLevel Level to use for fallback skills
 * @returns Promise<string> resolves to "skill level" or "" if cancelled
 */
export function selectSkillDialog(
    parsed: Array<{ skill: string, level: string | number }>,
    allowedSkills: string[],
    dialogTitle: string,
): Promise<string> {
    return new Promise((resolve) => {
        let buttons: Record<string, any> = {};
        parsed.forEach(({ skill, level }) => {
            const skillLevelLabel = isNaN(Number(level)) ? "?" : `${level}`;
            buttons[skill] = {
                label: `${foundryApi.localize(`splittermond.skillLabel.${skill}`)} ${skillLevelLabel}`,
                callback: () => resolve(`${skill} ${level}`)
            };
        });
        // fallback: all skills if none valid
        if (Object.keys(buttons).length === 0) {
            allowedSkills.forEach(skill => {
                buttons[skill] = {
                    label: foundryApi.localize(`splittermond.skillLabel.${skill}`),
                    callback: () => resolve(`${skill} ${defaultLevel}`)
                };
            });
        }
        buttons["_cancel"] = {
            label: foundryApi.localize("splittermond.cancel"),
            callback: () => resolve("")
        };
        //@ts-ignore
        let dialog = new Dialog({
            title: dialogTitle,
            content: "",
            buttons: buttons
        }, {
            classes: ["splittermond", "dialog", "selection"]
        });
        dialog.render(true);
    });
}
