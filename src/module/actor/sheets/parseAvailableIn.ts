import {foundryApi} from "../../api/foundryApi";

const defaultLevel = 0;
type SkillOption = { skill: string, level: number|null };
type SelectedOption = Omit<SkillOption,"level"> & {level:number}
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
        const level = isNaN(protoLevel) ? null: protoLevel;
        if (!allowedSkills.includes(skill)){
            return null
        }
        return { skill, level };
    }).filter(option => option !== null);
}

/**
 * We're not using DialogV2, because it is way harder to set up the one-click selection with buttons.
 * Prompts the user to select a skill/level from parsed options, or falls back to all allowed skills.
 * @param parsed Array of { skill, level }
 * @param allowedSkills All valid skill ids
 * @param dialogTitle Title for the dialog
 * @returns Promise<SkillOption> resolves to "skill level" or "" if cancelled
 */
export function selectSkillDialog(
    parsed: Array<SkillOption>,
    allowedSkills: string[],
    dialogTitle: string,
): Promise<SelectedOption|null> {
    return new Promise((resolve) => {
        let buttons: Record<string, any> = {};
        parsed.forEach(({ skill, level }) => {
            const skillLevelLabel = level == null ? "" : `${level}`;
            buttons[skill] = {
                label: `${foundryApi.localize(`splittermond.skillLabel.${skill}`)} ${skillLevelLabel}`,
                callback: () => resolve({skill, level: level ?? defaultLevel}),
            };
        });
        // fallback: all skills if none valid
        if (Object.keys(buttons).length === 0) {
            allowedSkills.forEach(skill => {
                buttons[skill] = {
                    label: foundryApi.localize(`splittermond.skillLabel.${skill}`),
                    callback: () => resolve({skill, level: defaultLevel})
                };
            });
        }
        buttons["_cancel"] = {
            label: foundryApi.localize("splittermond.cancel"),
            callback: () => resolve(null)
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
