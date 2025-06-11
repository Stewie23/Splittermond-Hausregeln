global.Application = class {
    constructor(app) {
    }

    activateListeners(html) {
    }

    getData() {
    }
};

global.Hooks = {
    once(){},
    on(){},
    off(){},
    callAll(){},
    call(){},
}

class FoundryDocument {
    constructor(data, context) {
    }

    async update(data, options){
        for (const key in data) {
            this[key] = data[key];
        }
    }
}

global.Actor = class Actor extends FoundryDocument{
}

global.Item = class Item extends FoundryDocument{
};

global.ChatMessage = class ChatMessage extends FoundryDocument{
};

global.foundry = {
    data: {
        fields: {
            StringField: class {
                options = null;

                constructor(options) {
                    this.options = options
                }
            },
            NumberField: class {
                options = null;

                constructor(options) {
                    this.options = options
                }
            },
            ObjectField: class {
                options = null;

                constructor(options) {
                    this.options = options
                }
            },
            SchemaField: class {
                /**@type object */ schema = null;
                /**@type unknown */ options = null;

                constructor(schema, options) {
                    this.schema = schema;
                    this.options = options
                }
            },
            BooleanField: class {
                /**@type unknown */ options = null;

                constructor(options) {
                    this.options = options
                }
            },
            EmbeddedDataField: class {
                /**@type function*/ type = null;
                /**@type unknown */ options = null;

                constructor(type, options) {
                    this.type = type;
                    this.options = options;
                }
            }
        }
    },
    abstract: {
        DataModel: class {
            constructor(data, context = {}) {
                for (const key in data) {
                    Object.defineProperty(this, key, {
                        value: data[key],
                        writable: true,
                        enumerable: true,
                        configurable: true
                    });
                }
                if("parent" in context){
                    Object.defineProperty(this, "parent", {
                        value: context.parent,
                        writable: true,
                        enumerable: true,
                        configurable: true
                    });
                }
            }

            updateSource(data, context) {
                for (const key in data) {
                    this[key] = data[key];
                }
            }

            /**
             * @return {object}
             */
            toObject() {
                return JSON.parse(JSON.stringify(this));
            }
        }
    },
    appv1: {
        sheets: {
            ItemSheet: class {
                constructor(item) {
                    this.item = item;
                    this.system = {};
                }
            }
        }
    },
    applications:{
        api:{
            DialogV2: class {
                render(){};
                addEventListener(){};
                close(){};
            }
        }
    }
};

global.Dialog = class {
    constructor(dialogData, options) {
    }
};

global.game = {};

global.CONFIG = {};

/**
 *  @param {T} input
 *  @return {T}
 */
export function identity(input) {
    return input;
}


export default {};
