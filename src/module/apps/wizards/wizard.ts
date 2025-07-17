import {
    ApplicationContextOptions,
    ApplicationRenderContext,
    SplittermondApplication
} from "../../data/SplittermondApplication";

export default abstract class SplittermondWizard extends SplittermondApplication {
    constructor(options: Record<string, any> = {}) {
        super(options);
    }

    async _prepareContext(options: ApplicationContextOptions) {
        const data = await super._prepareContext(options);
        data.ready = false;
        return data;
    }

    async _onRender( context: ApplicationRenderContext,options?:ApplicationContextOptions) {
        await super._onRender(context,options);

        this.element.querySelector('button[name="save"]')?.addEventListener("click", (e)=>this._onSave(e))
        this.element.querySelector('button[name="cancel"]')?.addEventListener("click", (e)=>this._onCancel(e))
    }

    /**
     * @sealed
     */
    _onSave(event: Event) {
        this._onSaveEvent(event);
        this.close();
    }

    /**
     * @sealed
     */
    _onCancel(event: Event) {
        this._onCancelEvent(event);
        this.close();
    }

    protected abstract _onCancelEvent(event: Event):void;
    protected abstract _onSaveEvent(event: Event): void;
}

